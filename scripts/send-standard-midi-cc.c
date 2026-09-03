#include <CoreMIDI/CoreMIDI.h>
#include <stdio.h>
#include <stdlib.h>

static int parse(const char *value, int minimum, int maximum) {
  char *end = NULL;
  long parsed = strtol(value, &end, 10);
  if (*value == '\0' || *end != '\0' || parsed < minimum || parsed > maximum) {
    return -1;
  }
  return (int)parsed;
}

int main(int argc, char **argv) {
  if (argc != 5) {
    fprintf(stderr,
            "Usage: %s <destination> <channel 1-16> <controller 0-23> <value 0-127>\n",
            argv[0]);
    return 2;
  }

  int destinationIndex = parse(argv[1], 0, MIDIGetNumberOfDestinations() - 1);
  int channel = parse(argv[2], 1, 16);
  int controller = parse(argv[3], 0, 23);
  int value = parse(argv[4], 0, 127);
  if (destinationIndex < 0 || channel < 0 || controller < 0 || value < 0) {
    fprintf(stderr, "Invalid destination, channel, controller, or value.\n");
    return 2;
  }

  MIDIClientRef client;
  MIDIPortRef port;
  if (MIDIClientCreate(CFSTR("FM1 bounded FX CC sender"), NULL, NULL, &client) != noErr ||
      MIDIOutputPortCreate(client, CFSTR("FM1 bounded FX CC sender"), &port) != noErr) {
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
