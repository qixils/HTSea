import style from './style.module.scss';

import {Component} from 'react';
import {toCodePoints} from 'twemoji-parser';

import Tooltip from '../Tooltip/Tooltip';

import emojiNames from '../../util/emoji-names.json';

// Copied in from twemoji-parser because they don't export it
const vs16RegExp = /\uFE0F/g;
// avoid using a string literal like '\u200D' here because minifiers expand it inline
const zeroWidthJoiner = String.fromCharCode(0x200d);

const removeVS16s = rawEmoji => {
	return rawEmoji.indexOf(zeroWidthJoiner) < 0 ? rawEmoji.replace(vs16RegExp, '') : rawEmoji;
};

const withEmoji = Component => {
	const Emoji = props => {
		const {emoji, ...rest} = props;
		let emojiName;
		let emojiURL;
		if (typeof emoji === 'string') {
			emojiName = emojiNames[emoji];
			// TODO: self-host twemoji
			const codepoints = toCodePoints(removeVS16s(emoji)).join('-');
			emojiURL = `https://twemoji.maxcdn.com/v/latest/svg/${codepoints}.svg`;
		} else {
			emojiName = emoji.name;
			emojiURL = `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}`;
		}
		console.log(emoji);
		return <Component emojiName={emojiName} emojiURL={emojiURL} {...rest} />;
	};
	return Emoji;
};

const ReactionEmoji = withEmoji(({emojiName, emojiURL}) =>
	<img
		draggable={false}
		className={`${style['emoji']} ${style['reaction-emoji']}`}
		src={emojiURL}
		alt={`:${emojiName}:`}
	/>);

class _TooltipEmoji extends Component {
	constructor (props) {
		super(props);

		this.state = {
			hover: false
		};

		this.onPointerEnter = this.onPointerEnter.bind(this);
		this.onPointerOut = this.onPointerOut.bind(this);
	}

	onPointerEnter () {
		this.setState({hover: true});
	}

	onPointerOut () {
		this.setState({hover: false});
	}

	render () {
		const {emojiURL, emojiName} = this.props;
		return (
			<span
				className={style['emoji-container']}
				onPointerEnter={this.onPointerEnter}
				onPointerOut={this.onPointerOut}
			>
				<img draggable={false} className={style['emoji']} src={emojiURL} alt={`:${emojiName}:`}></img>
				{this.state.hover ? <Tooltip side="top">{emojiName}</Tooltip> : null}
			</span>
		);
	}
}

const TooltipEmoji = withEmoji(_TooltipEmoji);

export {TooltipEmoji, ReactionEmoji};
