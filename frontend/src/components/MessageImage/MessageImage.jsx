import style from './style.module.scss';

// `width: auto; height: auto` overrides unloaded images' "intrinsic size", causing the scroll to jump when they load,
// so use this JS to style them instead
const sizeImageToFit = (width, height, maxWidth, maxHeight) => {
	if (!width || !height) {
		// fall back to CSS for dynamically-sized images
		return `max-width: ${maxWidth}px; max-height: ${maxHeight}px; width: auto; height: auto;`;
	}

	if (width < maxWidth && height < maxHeight) return '';

	const scaleFactor = Math.min(maxWidth / width, maxHeight / height);

	return {width: `${width * scaleFactor}px`, height: `${height * scaleFactor}px`};
};

const MessageImage = ({width, height, maxWidth = 400, maxHeight = 300, src}) => (
	<img
		width={width || null}
		height={height || null}
		src={src}
		className={style['message-image']}
		style={sizeImageToFit(
			width,
			height,
			maxWidth,
			maxHeight
		)}
		alt=""
	/>
);

export default MessageImage;
