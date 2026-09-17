/* Sends exactly one standard MIDI note message, including velocity 0, which the FM1
   records as a silent sequencer step. Standard channel MIDI only: no SysEx and no
   vendor frames. */
#include <CoreMIDI/CoreMIDI.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static int parse(const char *value, int minimum, int maximum) {
  char *end = NULL;
  long parsed = strtol(value, &end, 10);
  if (*value == '\0' || *end != '\0' || parsed < minimum || parsed > maximum) return -1;
  return (int)parsed;
}

int main(int argc, char **argv) {
  if (argc != 6 || (strcmp(argv[2], "on") != 0 && strcmp(argv[2], "off") != 0)) {
    fprintf(stderr, "Usage: %s <destination> <on|off> <channel 1-16> <note 0-127> <velocity 0-127>\n", argv[0]);
    return 2;
  }
  int destination = parse(argv[1], 0, MIDIGetNumberOfDestinations() - 1);
  int channel = parse(argv[3], 1, 16);
  int note = parse(argv[4], 0, 127);
  int velocity = parse(argv[5], 0, 127);
  if (destination < 0 || channel < 0 || note < 0 || velocity < 0) {
    fprintf(stderr, "Invalid destination, channel, note, or velocity.\n");
    return 2;
  }

  Byte status = (Byte)((strcmp(argv[2], "on") == 0 ? 0x90 : 0x80) | (channel - 1));
  Byte bytes[] = { status, (Byte)note, (Byte)velocity };
  MIDIClientRef client;
  MIDIPortRef port;
  if (MIDIClientCreate(CFSTR("FM1 one message"), NULL, NULL, &client) != noErr ||
      MIDIOutputPortCreate(client, CFSTR("FM1 one message"), &port) != noErr) {
    fprintf(stderr, "Could not create CoreMIDI output.\n");
    return 1;
  }
  MIDIPacketList list;
  MIDIPacket *packet = MIDIPacketListInit(&list);
  packet = MIDIPacketListAdd(&list, sizeof(list), packet, 0, 3, bytes);
  if (packet == NULL || MIDISend(port, MIDIGetDestination(destination), &list) != noErr) {
    fprintf(stderr, "Could not send.\n");
    MIDIClientDispose(client);
    return 1;
  }
  printf("to_fm1 %02X %02X %02X\n", bytes[0], bytes[1], bytes[2]);
  MIDIClientDispose(client);
  return 0;
}
