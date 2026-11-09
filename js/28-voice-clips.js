// v1.462 (backlog D.9, recorded voices; Michael: A, 21 Oct): the recorded voices, one kid reading one line each.
// WRITTEN BY scripts/voicepack.mjs from a folder of VoiceStudio clips: do not edit by hand. A key is a clip's name
// (docs/voice_script.md, "How a clip is named"); `text` is the line's words when it was recorded, and the clip plays
// only while the game's line still says them (the browser voice says it otherwise); `sec` its length; `b64` the audio.
// The audio is decoded the first time its line is said (voiceClipPlay in 20-characters), never at startup.
const VOICE_CLIPS = {
};
