// Hardware-research sender for the FM-1+VA sound-setting CCs (docs/fm1-va-controller-tests.md).
// It sends only CC 24-31, 52-57, and 70-78, so it cannot reach the CCs FM-1+VA reads as its own
// knobs and buttons (85-119), which can start recording or switch Bluetooth.
#include <CoreMIDI/CoreMIDI.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static int parse(const char *value, int minimum, int maximum) {
  char *end = NULL;
  long parsed = strtol(value, &end, 10);
  if (*value == '\0' || *end != '\0' || parsed < minimum || parsed > maximum) {
    return -1;
  }
  return (int)parsed;
}

static int isSoundController(int controller) {
  return (controller >= 24 && controller <= 31) || (controller >= 52 && controller <= 57) ||
         (controller >= 70 && controller <= 78);
}

static void listDestinations(void) {
  ItemCount count = MIDIGetNumberOfDestinations();
  for (ItemCount index = 0; index < count; index++) {
    CFStringRef name = NULL;
    char buffer[256] = "(unnamed)";
    MIDIEndpointRef destination = MIDIGetDestination(index);
    if (MIDIObjectGetStringProperty(destination, kMIDIPropertyDisplayName, &name) == noErr) {
      CFStringGetCString(name, buffer, sizeof(buffer), kCFStringEncodingUTF8);
      CFRelease(name);
    }
    printf("%lu %s\n", (unsigned long)index, buffer);
  }
}

int main(int argc, char **argv) {
  if (argc == 2 && strcmp(argv[1], "list") == 0) {
    listDestinations();
    return 0;
  }
  if (argc != 5) {
    fprintf(stderr,
            "Usage: %s list\n"
            "       %s <destination> <channel 1-16> <controller 24-31, 52-57, 70-78> "
            "<value 0-127>\n",
            argv[0], argv[0]);
    return 2;
  }

  int destinationIndex = parse(argv[1], 0, MIDIGetNumberOfDestinations() - 1);
  int channel = parse(argv[2], 1, 16);
  int controller = parse(argv[3], 0, 127);
  int value = parse(argv[4], 0, 127);
  if (destinationIndex < 0 || channel < 0 || controller < 0 || !isSoundController(controller) ||
      value < 0) {
    fprintf(stderr, "Invalid destination, channel, controller, or value.\n");
    return 2;
  }

  MIDIClientRef client;
  MIDIPortRef port;
  if (MIDIClientCreate(CFSTR("FM-1+VA sound CC sender"), NULL, NULL, &client) != noErr ||
      MIDIOutputPortCreate(client, CFSTR("FM-1+VA sound CC sender"), &port) != noErr) {
    fprintf(stderr, "Could not create CoreMIDI output.\n");
    return 1;
  }

  Byte bytes[] = { (Byte)(0xB0 | (channel - 1)), (Byte)controller, (Byte)value };
  MIDIPacketList list;
  MIDIPacket *packet = MIDIPacketListInit(&list);
  packet = MIDIPacketListAdd(&list, sizeof(list), packet, 0, 3, bytes);
  MIDIEndpointRef destination = MIDIGetDestination(destinationIndex);
  if (packet == NULL || MIDISend(port, destination, &list) != noErr) {
    fprintf(stderr, "Could not send Control Change.\n");
    MIDIClientDispose(client);
    return 1;
  }

  printf("to_fm1 B%X %02X %02X\n", channel - 1, controller, value);
  MIDIClientDispose(client);
  return 0;
}
