import { readFileSync } from 'node:fs'
import path from 'node:path'

import { unpackSevenBitStream } from '@/lib/fm1-firmware'
import {
  officialOpenChecksum,
  officialOpenHeader,
  packSevenBitStream,
} from '@/lib/official-open-transfer'
import { type makeFakeFm1Ports, officialOpenInfoReply } from '@/test/fake-fm1-midi'

// The reads of 2026-10-20 on Official Open V14, exactly as the FM1 sent them.
const capture: { captures: { hex?: string; what: string }[] } = JSON.parse(
  readFileSync(
    path.resolve(
      __dirname,
      '../../docs/hardware-runs/official-open-v14-reads-capture-2026-10-20.json',
    ),
    'utf8',
  ),
)

/** One read of the capture, such as `bank 1` or `voice, track 4`, as the FM1 sent it. */
function capturedOfficialOpenRead(what: string) {
  const hex = capture.captures.find((entry) => entry.what === what)?.hex
  if (!hex) throw new Error(`The capture holds no ${what}.`)
  return Uint8Array.from(hex.match(/../g) ?? [], (byte) => Number.parseInt(byte, 16))
}

/** The engines command 0 reported in the capture: DX7 on tracks 1 and 4. */
const capturedOfficialOpenEngines = [0, 1, 5, 0, 3, 3, 3, 3]

/**
 * Makes `ports` answer commands 0, 1, 2, and 6 as the V14 FM1 of the capture did, and returns the
 * command of every request sent, in order.
 */
export function answerFromOfficialOpenCapture(ports: ReturnType<typeof makeFakeFm1Ports>) {
  const commands: number[] = []
  let held = new Uint8Array()
  ports.output.send.mockImplementation((request) => {
    const command = request[5]
    commands.push(command)
    const token = request[6] | (request[7] << 7)
    const payload = Array.from(unpackSevenBitStream(request.slice(8, -2)))
    const reply = (data: readonly number[]) => {
      const body = [...officialOpenHeader.slice(1), command | 0x40, request[6], request[7]]
      body.push(...packSevenBitStream([0, ...data]))
      ports.input.receive([0xf0, ...body, officialOpenChecksum(body), 0xf7])
    }
    if (command === 0)
      ports.input.receive(officialOpenInfoReply(token, capturedOfficialOpenEngines))
    if (command === 1) {
      held = capturedOfficialOpenRead(
        payload[0] === 4 ? `bank ${payload[1]}` : `voice, track ${payload[1] + 1}`,
      )
      reply([held.length & 0xff, held.length >> 8])
    }
    if (command === 2) {
      const offset = payload[0] | (payload[1] << 8)
      reply(Array.from(held.slice(offset, offset + payload[2])))
    }
    if (command === 6) reply([])
  })
  return commands
}
