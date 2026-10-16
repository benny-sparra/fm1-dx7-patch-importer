/**
 * British English for what sending a patch to a track of M-VAVE's Official Open says. Only the
 * track status shows it, and that loads only on Official Open, so it loads with it rather than with
 * the page: `@/i18n/official-open` adds it to `en-GB`. Every other locale keeps this section in its
 * own file.
 */
export default {
  officialOpenTracks: {
    sent: 'Sent “{{name}}” to track {{track}}. Save the project on the FM1 to keep it.',
    noTrack:
      'Note channel {{channel}} reaches no track, so the patch was not sent. Official Open plays tracks 1 to 7 on channels 1 to 7 and track 8 on channel 10: choose one of those as the note channel in MIDI settings.',
    notDx7:
      'Track {{track}} runs {{engine}}, which cannot take a patch, so nothing was sent. Set track {{track}} to DX7 on the FM1, or choose the note channel of a track that runs DX7.',
    unread:
      'The FM1 did not say which engine track {{track}} runs, so the patch was not sent. Check that the FM1 is connected, then try again.',
  },
}
