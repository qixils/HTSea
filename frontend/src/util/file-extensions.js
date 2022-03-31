const isImage = path => /\.(jpe?g|png|gif)$/i.test(path);
const isAudio = path => /\.(wav|mp3|ogg|flac)$/i.test(path);
const isVideo = path => /\.(mkv|mp4|mov)$/i.test(path);

export {isImage, isAudio, isVideo};
