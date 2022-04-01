/* eslint-disable react/display-name */
import style from './style.module.scss';

import {Component, Fragment} from 'react';
import {parser, rulesEmbed, markdownEngine} from 'discord-markdown';
import emojiRegex from 'twemoji-parser/dist/lib/regex';

import {TooltipEmoji} from '../Emoji/Emoji';

import classNames from 'classnames';
import getMemberName from '../../util/get-member-name';

class Spoiler extends Component {
	constructor (props) {
		super(props);

		this.state = {spoiled: false};
		this.toggleSpoiled = this.toggleSpoiled.bind(this);
	}

	toggleSpoiled () {
		this.setState(state => {
			return {spoiled: !state.spoiled};
		});
	}

	render () {
		return <span
			className={classNames({
				[style['spoiler']]: true,
				[style['open']]: this.state.spoiled
			})}
			onClick={this.toggleSpoiled}
		>
			{this.props.children}
		</span>;
	}
}

const UserMention = props =>
	<span className={`${style['mention']} ${style['user']}`}>
		{getMemberName(props.id, props.messageData, true)}
	</span>;

const ChannelMention = props => {
	const hasChannel = props.messageData && (props.id in props.messageData.channels);
	const channel = props.messageData && props.messageData.channels[props.id];
	return (
		<span className={`${style['mention']} ${style['channel']}`}>
			{hasChannel ? `#${channel.name}` : '#deleted-channel'}
		</span>
	);
};

const RoleMention = (props => {
	const role = props.messageData && props.messageData.roles ? props.messageData.roles[props.id] : null;
	if (!role) return '@deleted-role';

	// If the role has no color, use the default blue. Otherwise, define a custom style.
	const roleStyle = {};
	if (role.color !== 0) {
		const roleColorR = (role.color >> 16) & 0xff;
		const roleColorG = (role.color >> 8) & 0xff;
		const roleColorB = role.color & 0xff;
		roleStyle.color = `rgb(${roleColorR}, ${roleColorG}, ${roleColorB})`;
		roleStyle.backgroundColor = `rgba(${roleColorR}, ${roleColorG}, ${roleColorB}, 0.1)`;
	}

	return (
		<span
			className={style['mention']}
			style={roleStyle}
		>
			@{role.name}
		</span>
	);
});

// If the URL is "dangerous" (cannot be sanitized), return regular text. Otherwise, create a link.
const makeLink = (content, node) => {
	const target = markdownEngine.sanitizeUrl(node.target);

	return target ?
		<a href={target}>{content}</a> :
		<span>{content}</span>;
};

const toTwemoji = text => {
	emojiRegex.lastIndex = 0;
	const nodes = [];
	let result;
	let lastLastIndex = 0;
	let i = 0;
	// eslint-disable-next-line no-cond-assign
	while (result = emojiRegex.exec(text)) {
		const emojiText = result[0];
		nodes.push(text.slice(lastLastIndex, result.index));
		nodes.push(<TooltipEmoji emoji={emojiText} key={i} />);
		lastLastIndex = emojiRegex.lastIndex;
		i++;
	}

	if (lastLastIndex !== text.length) {
		nodes.push(text.slice(lastLastIndex));
	}

	return nodes;
};

const reactRules = {
	text: content => toTwemoji(content),
	em: content => <em>{content}</em>,
	strong: content => <strong>{content}</strong>,
	u: content => <u>{content}</u>,
	strike: content => <strike>{content}</strike>,
	spoiler: content => <Spoiler>{content}</Spoiler>,
	br: () => <br/>,
	inlineCode: content => <code className={style['code']}>{content}</code>,
	codeBlock: content => <pre className={style['code-block']}>{content}</pre>,
	blockQuote: content => <blockquote className={style['block-quote']}>{content}</blockquote>,
	url: makeLink,
	autolink: makeLink,
	discordUser: (content, node, messageData) => <UserMention id={node.id} messageData={messageData} />,
	discordEveryone: () => <span className={style['mention']}>@everyone</span>,
	discordHere: () => <span className={style['mention']}>@here</span>,
	discordRole: (content, node, messageData) => <RoleMention id={node.id} messageData={messageData} />,
	discordChannel: (content, node, messageData) => <ChannelMention id={node.id} messageData={messageData} />,
	discordEmoji: (content, node) => <TooltipEmoji emoji={node} />
};

const reactify = (nodeArray, removeBreaks, messageData) => nodeArray.map((node, index) => {
	const nodeHasContent = Object.prototype.hasOwnProperty.call(node, 'content');
	let content = node.content;
	if (nodeHasContent && Array.isArray(node.content)) {
		content = reactify(node.content, removeBreaks, messageData);
	}

	if (node.type === 'br' && removeBreaks) {
		return ' ';
	}

	if (Object.prototype.hasOwnProperty.call(reactRules, node.type)) {
		return <Fragment key={index}>{reactRules[node.type](content, node, messageData)}</Fragment>;
	}

	// eslint-disable-next-line no-console
	console.warn(`Unknown Markdown node type: ${node.type}`);
	return nodeHasContent ? <Fragment key={index}>{reactRules.text(content)}</Fragment> : null;
});

const embedParserMD = markdownEngine.parserFor(rulesEmbed);
const embedParser = source => embedParserMD(source, {inline: true});

const Markdown = props => reactify(
	props.embed ? embedParser(props.text) : parser(props.text),
	props.removeBreaks,
	props.messageData
);

export default Markdown;
