#include <CoreMIDI/CoreMIDI.h>
#include <mach/mach_time.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/time.h>
#include <time.h>
#include <unistd.h>

// Records one pattern into an FM1 the operator has already armed, exactly as
// docs/seq-rec-001-recording-contract.md §3 describes: a sounding step is `9n nn vv` then `8n nn 00`,
// a rest is `9n 3C 00` alone. Nothing else is ever sent. Every argument is validated before the
// first byte, and Ctrl-C stops at the next step boundary without leaving a note held.

#define MAX_STEPS 16
#define REST_PITCH 0x3C

typedef struct {
  int isRest;
  int note;
  int velocity;
} Step;

static volatile sig_atomic_t stopRequested = 0;

static void requestStop(int signal) {
  (void)signal;
  stopRequested = 1;
}

static int parse(const char *value, int minimum, int maximum) {
  char *end = NULL;
  long parsed = strtol(value, &end, 10);
  if (*value == '\0' || *end != '\0' || parsed < minimum || parsed > maximum) {
    return -1;
  }
  return (int)parsed;
}

static int parseStep(const char *value, Step *step) {
  if (strcmp(value, "r") == 0) {
    step->isRest = 1;
    step->note = REST_PITCH;
    step->velocity = 0;
    return 0;
  }
  char buffer[16];
  if (strlen(value) >= sizeof(buffer)) return -1;
  strcpy(buffer, value);
  char *colon = strchr(buffer, ':');
  if (colon == NULL) return -1;
  *colon = '\0';
  step->isRest = 0;
  step->note = parse(buffer, 0, 127);
  step->velocity = parse(colon + 1, 1, 127);
  return step->note < 0 || step->velocity < 0 ? -1 : 0;
}

static uint64_t nowNs(void) {
  static mach_timebase_info_data_t timebase;
  if (timebase.denom == 0) mach_timebase_info(&timebase);
  return mach_absolute_time() * timebase.numer / timebase.denom;
}

// Sleeps until an absolute deadline, so a late wake-up delays later messages rather than
// shortening the next interval.
static void sleepUntil(uint64_t deadlineNs) {
  for (;;) {
    uint64_t now = nowNs();
    if (now >= deadlineNs) return;
    uint64_t remaining = deadlineNs - now;
    struct timespec interval = { (time_t)(remaining / 1000000000ull), (long)(remaining % 1000000000ull) };
    nanosleep(&interval, NULL);
  }
}

static void printUtc(char *out, size_t size) {
  struct timeval tv;
  gettimeofday(&tv, NULL);
  struct tm utc;
  gmtime_r(&tv.tv_sec, &utc);
  size_t length = strftime(out, size, "%Y-%m-%dT%H:%M:%S", &utc);
  snprintf(out + length, size - length, ".%03dZ", (int)(tv.tv_usec / 1000));
}

static int send(MIDIPortRef port, MIDIEndpointRef destination, const Byte *bytes, uint64_t startNs,
                const char *kind, int stepNumber) {
  MIDIPacketList list;
  MIDIPacket *packet = MIDIPacketListInit(&list);
  packet = MIDIPacketListAdd(&list, sizeof(list), packet, 0, 3, bytes);
  if (packet == NULL || MIDISend(port, destination, &list) != noErr) {
    fprintf(stderr, "Could not send %s for step %d.\n", kind, stepNumber);
    return -1;
  }
  char utc[40];
  printUtc(utc, sizeof(utc));
  printf("{\"captured_at_utc\":\"%s\",\"direction\":\"to_fm1\",\"kind\":\"%s\",\"relative_time_ms\":%llu,"
         "\"step\":%d,\"bytes_hex\":\"%02X %02X %02X\"}\n",
         utc, kind, (unsigned long long)((nowNs() - startNs) / 1000000ull), stepNumber, bytes[0], bytes[1],
         bytes[2]);
  fflush(stdout);
  return 0;
}

int main(int argc, char **argv) {
  if (argc < 7 || argc > 6 + MAX_STEPS) {
    fprintf(stderr,
            "Usage: %s <destination> <channel 1-16> <hold-ms 80-10000> <step-period-ms 100-10000> "
            "<rest-period-ms 100-10000> <step>...\n"
            "  step: <note 0-127>:<velocity 1-127> for a sounding step, or r for a rest; 1-%d steps.\n",
            argv[0], MAX_STEPS);
    return 2;
  }

  int destinationIndex = parse(argv[1], 0, (int)MIDIGetNumberOfDestinations() - 1);
  int channel = parse(argv[2], 1, 16);
  int holdMs = parse(argv[3], 80, 10000);
  int stepPeriodMs = parse(argv[4], 100, 10000);
  int restPeriodMs = parse(argv[5], 100, 10000);
  if (destinationIndex < 0 || channel < 0 || holdMs < 0 || stepPeriodMs < 0 || restPeriodMs < 0) {
    fprintf(stderr, "Destination, channel, or timing is out of range.\n");
    return 2;
  }
  if (holdMs >= stepPeriodMs) {
    fprintf(stderr, "The hold must end before the next step starts.\n");
    return 2;
  }

  Step steps[MAX_STEPS];
  int stepCount = argc - 6;
  for (int index = 0; index < stepCount; index += 1) {
    if (parseStep(argv[6 + index], &steps[index]) != 0) {
      fprintf(stderr, "Step %d (%s) is not <note>:<velocity> or r.\n", index + 1, argv[6 + index]);
      return 2;
    }
  }

  MIDIClientRef client = 0;
  MIDIPortRef port = 0;
  MIDIEndpointRef destination = MIDIGetDestination((ItemCount)destinationIndex);
  if (MIDIClientCreate(CFSTR("FM1 bounded pattern sender"), NULL, NULL, &client) != noErr ||
      MIDIOutputPortCreate(client, CFSTR("FM1 bounded pattern output"), &port) != noErr) {
    fprintf(stderr, "Could not open CoreMIDI output.\n");
    return 1;
  }

  signal(SIGINT, requestStop);
  Byte noteOnStatus = (Byte)(0x90 | (channel - 1));
  Byte noteOffStatus = (Byte)(0x80 | (channel - 1));
  uint64_t startNs = nowNs();
  uint64_t stepStartNs = startNs;
  int reached = 0;
  int failed = 0;

  for (int index = 0; index < stepCount && !stopRequested && !failed; index += 1) {
    sleepUntil(stepStartNs);
    const Step *step = &steps[index];
    if (step->isRest) {
      Byte rest[] = { noteOnStatus, REST_PITCH, 0x00 };
      failed = send(port, destination, rest, startNs, "rest", index + 1) != 0;
      stepStartNs += (uint64_t)restPeriodMs * 1000000ull;
    } else {
      Byte noteOn[] = { noteOnStatus, (Byte)step->note, (Byte)step->velocity };
      Byte noteOff[] = { noteOffStatus, (Byte)step->note, 0x00 };
      failed = send(port, destination, noteOn, startNs, "note-on", index + 1) != 0;
      if (failed) break;
      // The Note Off always follows its Note On, even after Ctrl-C, so no note is left held.
      sleepUntil(stepStartNs + (uint64_t)holdMs * 1000000ull);
      failed = send(port, destination, noteOff, startNs, "note-off", index + 1) != 0;
      stepStartNs += (uint64_t)stepPeriodMs * 1000000ull;
    }
    if (!failed) reached = index + 1;
  }

  MIDIPortDispose(port);
  MIDIClientDispose(client);
  if (failed) return 1;
  if (reached < stepCount) {
    fprintf(stderr, "Stopped after step %d of %d; the pattern holds a partial overwrite.\n", reached,
            stepCount);
    return 130;
  }
  fprintf(stderr, "Sent %d steps.\n", stepCount);
  return 0;
}
