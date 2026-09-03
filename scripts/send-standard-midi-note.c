#include <CoreMIDI/CoreMIDI.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

typedef struct {
  int destinationIndex;
  int channel;
  int firstNote;
  int noteCount;
  int velocity;
  int durationMs;
  int gapMs;
} NoteSeries;

static int parse(const char *value, int minimum, int maximum) {
  char *end = NULL;
  long parsed = strtol(value, &end, 10);
  if (*value == '\0' || *end != '\0' || parsed < minimum || parsed > maximum) {
    return -1;
  }
  return (int)parsed;
}

static int send(MIDIPortRef port, MIDIEndpointRef destination, const Byte *bytes, Byte count) {
  MIDIPacketList list;
  MIDIPacket *packet = MIDIPacketListInit(&list);
  packet = MIDIPacketListAdd(&list, sizeof(list), packet, 0, count, bytes);
  return packet == NULL ? -1 : MIDISend(port, destination, &list);
}

static int sendNote(MIDIPortRef port, MIDIEndpointRef destination, int channel, int note, int velocity,
                    int durationMs, int elapsedMs) {
  Byte noteOn[] = { (Byte)(0x90 | (channel - 1)), (Byte)note, (Byte)velocity };
  Byte noteOff[] = { (Byte)(0x80 | (channel - 1)), (Byte)note, 0x00 };

  if (send(port, destination, noteOn, 3) != noErr) {
    fprintf(stderr, "Could not send Note On.\n");
    return -1;
  }
  printf("to_fm1 t+%dms %02X %02X %02X\n", elapsedMs, noteOn[0], noteOn[1], noteOn[2]);
  fflush(stdout);
  usleep((useconds_t)durationMs * 1000);
  if (send(port, destination, noteOff, 3) != noErr) {
    fprintf(stderr, "Could not send Note Off.\n");
    return -1;
  }
  printf("to_fm1 t+%dms %02X %02X %02X\n", elapsedMs + durationMs, noteOff[0], noteOff[1], noteOff[2]);
  fflush(stdout);
  return 0;
}

int main(int argc, char **argv) {
  int isSeries = argc == 9 && strcmp(argv[1], "--ascending") == 0;
  if (argc != 6 && !isSeries) {
    fprintf(stderr,
            "Usage: %s <destination> <channel 1-16> <note 0-127> <velocity 1-127> <duration-ms 1-10000>\n"
            "   or: %s --ascending <destination> <channel 1-16> <first-note 0-127> <count 1-16> <velocity 1-127> <duration-ms 1-10000> <gap-ms 0-10000>\n",
            argv[0], argv[0]);
    return 2;
  }

  int argumentOffset = isSeries ? 1 : 0;
  NoteSeries series = {
    .destinationIndex = parse(argv[1 + argumentOffset], 0, MIDIGetNumberOfDestinations() - 1),
    .channel = parse(argv[2 + argumentOffset], 1, 16),
    .firstNote = parse(argv[3 + argumentOffset], 0, 127),
    .noteCount = isSeries ? parse(argv[4 + argumentOffset], 1, 16) : 1,
    .velocity = parse(argv[4 + argumentOffset + isSeries], 1, 127),
    .durationMs = parse(argv[5 + argumentOffset + isSeries], 1, 10000),
    .gapMs = isSeries ? parse(argv[7 + argumentOffset], 0, 10000) : 0,
  };
  if (series.destinationIndex < 0 || series.channel < 0 || series.firstNote < 0 || series.noteCount < 0 ||
      series.firstNote + series.noteCount > 128 || series.velocity < 0 || series.durationMs < 0 || series.gapMs < 0) {
    fprintf(stderr, "Invalid destination, channel, note, velocity, or duration.\n");
    return 2;
  }

  MIDIClientRef client;
  MIDIPortRef port;
  if (MIDIClientCreate(CFSTR("FM1 bounded note sender"), NULL, NULL, &client) != noErr ||
      MIDIOutputPortCreate(client, CFSTR("FM1 bounded note sender"), &port) != noErr) {
    fprintf(stderr, "Could not create CoreMIDI output.\n");
    return 1;
  }

  MIDIEndpointRef destination = MIDIGetDestination(series.destinationIndex);
  for (int index = 0; index < series.noteCount; index++) {
    int elapsedMs = index * (series.durationMs + series.gapMs);
    if (sendNote(port, destination, series.channel, series.firstNote + index, series.velocity, series.durationMs,
                 elapsedMs) != 0) {
      MIDIClientDispose(client);
      return 1;
    }
    if (index < series.noteCount - 1 && series.gapMs > 0) {
      usleep((useconds_t)series.gapMs * 1000);
    }
  }
  MIDIClientDispose(client);
  return 0;
}
