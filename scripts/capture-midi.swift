#!/usr/bin/env swift

import CoreMIDI
import Foundation

enum CaptureError: Error, CustomStringConvertible {
  case invalidArguments
  case invalidSource(index: Int, count: Int)
  case midiFailure(operation: String, status: OSStatus)

  var description: String {
    switch self {
    case .invalidArguments:
      return "Usage: swift scripts/capture-midi.swift --list | --source <index>"
    case let .invalidSource(index, count):
      return "Source index \(index) is unavailable; CoreMIDI currently exposes \(count) source(s)."
    case let .midiFailure(operation, status):
      return "CoreMIDI failed to \(operation) (OSStatus \(status))."
    }
  }
}

func endpointName(_ endpoint: MIDIEndpointRef) -> String {
  var value: Unmanaged<CFString>?
  guard MIDIObjectGetStringProperty(endpoint, kMIDIPropertyDisplayName, &value) == noErr else {
    return "<unnamed>"
  }
  return value?.takeRetainedValue() as String? ?? "<unnamed>"
}

func sourceIndex() throws -> Int? {
  let arguments = Array(CommandLine.arguments.dropFirst())

  switch arguments {
  case ["--list"]:
    return nil
  case let arguments where arguments.count == 2 && arguments[0] == "--source":
    let source = arguments[1]
    guard let index = Int(source), index >= 0 else {
      throw CaptureError.invalidArguments
    }
    return index
  default:
    throw CaptureError.invalidArguments
  }
}

func writeJsonLine(_ value: [String: Any]) {
  guard let data = try? JSONSerialization.data(withJSONObject: value, options: [.sortedKeys]),
        let line = String(data: data, encoding: .utf8)
  else {
    fputs("Could not serialize captured CoreMIDI packet.\n", stderr)
    return
  }

  print(line)
  fflush(stdout)
}

do {
  guard let selectedSourceIndex = try sourceIndex() else {
    let count = MIDIGetNumberOfSources()
    for index in 0..<count {
      print("\(index)\t\(endpointName(MIDIGetSource(index)))")
    }
    exit(EXIT_SUCCESS)
  }

  let sourceCount = MIDIGetNumberOfSources()
  guard selectedSourceIndex < sourceCount else {
    throw CaptureError.invalidSource(index: selectedSourceIndex, count: Int(sourceCount))
  }

  let source = MIDIGetSource(selectedSourceIndex)
  var client = MIDIClientRef()
  var status = MIDIClientCreateWithBlock("FM1 passive capture" as CFString, &client) { _ in }
  guard status == noErr else {
    throw CaptureError.midiFailure(operation: "create client", status: status)
  }
  defer { MIDIClientDispose(client) }

  let formatter = ISO8601DateFormatter()
  formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

  var inputPort = MIDIPortRef()
  status = MIDIInputPortCreateWithBlock(client, "FM1 passive capture input" as CFString, &inputPort) {
    packetList,
    _ in
    var packet = packetList.pointee.packet

    for _ in 0..<packetList.pointee.numPackets {
      let bytes = withUnsafeBytes(of: packet.data) { rawBuffer in
        Array(rawBuffer.prefix(Int(packet.length)))
      }
      let bytesHex = bytes.map { String(format: "%02X", $0) }.joined(separator: " ")
      writeJsonLine([
        "captured_at_utc": formatter.string(from: Date()),
        "core_midi_timestamp": packet.timeStamp,
        "core_midi_packet_hex": bytesHex,
        "direction": "from_fm1",
        "source_index": selectedSourceIndex,
        "source_name": endpointName(source),
      ])
      packet = MIDIPacketNext(&packet).pointee
    }
  }
  defer { MIDIPortDispose(inputPort) }

  status = MIDIPortConnectSource(inputPort, source, nil)
  guard status == noErr else {
    throw CaptureError.midiFailure(operation: "connect source", status: status)
  }

  fputs(
    "Listening to CoreMIDI source \(selectedSourceIndex): \(endpointName(source)). " +
      "Writing one raw packet per NDJSON line to stdout. Press Ctrl-C to stop.\n",
    stderr,
  )
  RunLoop.current.run()
} catch {
  fputs("\(error)\n", stderr)
  exit(EXIT_FAILURE)
}
