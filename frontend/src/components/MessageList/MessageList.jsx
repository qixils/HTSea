import style from './style.module.scss';

import {Component, memo} from 'react';
import classNames from 'classnames';

import Attachment from '../Attachment/Attachment';
import Avatar from '../Avatar/Avatar';
import Embed from '../Embed/Embed';
import {ReactionEmoji} from '../Emoji/Emoji';
import Markdown from '../Markdown/Markdown';
import Tooltip from '../Tooltip/Tooltip';

import getMemberName from '../../util/get-member-name';

// TODO
const getMemberColor = () => 'white';
const formatTimestamp = timestamp => timestamp ? new Date(timestamp).toISOString() : '';

class Edited extends Component {
	constructor (props) {
		super(props);

		this.state = {
			stayOpen: false
		};

		this.toggleStayOpen = this.toggleStayOpen.bind(this);
	}

	toggleStayOpen () {
		this.setState(prevState => {
			return {
				stayOpen: !prevState.stayOpen
			};
		});
	}

	render () {
		return (
			<span className={classNames({
				[style['edited']]: true,
				[style['open']]: this.state.stayOpen,
				[style['closed']]: !this.state.stayOpen
			})}>
				<span onClick={this.toggleStayOpen}>(edited)</span>
				<Tooltip className={style['edited-date']}>
					{formatTimestamp(this.props.timestamp)}
				</Tooltip>
			</span>
		);
	}
}

const MessageReaction = ({archive, reaction}) => {
	const {count, emoji, emojiIsCustom} = reaction;
	return (
		<div className={style['reaction']}>
			<ReactionEmoji emoji={emojiIsCustom ? archive.emojis.get(emoji) : emoji} archive={archive} />
			<span className={style['reaction-count']}>{count}</span>
		</div>
	);
};

const MessageContents = ({message, messageRef, referenced, messageData}) => (
	<div
		className={classNames({[style.message]: true, [style.referenced]: referenced})}
		key={message.id} ref={messageRef}
	>
		<div className={style['message-content']}>
			<span><Markdown text={message.content} messageData={messageData} /></span>
			{message.editedTimestamp ?
				<Edited timestamp={message.editedTimestamp}></Edited> :
				null
			}
		</div>
		{message.attachments === null ? null : message.attachments.map((attachment, index) =>
			<Attachment
				key={index}
				attachment={messageData.attachments[attachment]}
			/>
		)}
		{message.embeds === null ? null : message.embeds.map((embed, index) =>
			<div className={style['embed-container']} key={index}>
				<Embed embed={embed} messageData={messageData} />
			</div>
		)}
		{!message.reactions ? null :
			<div className={style['message-reactions']}>
				{message.reactions.map((reaction, index) =>
					<MessageReaction
						key={reaction.emoji}
						reaction={reaction}
						reactions={message.reactions}
						reactionIndex={index}
						messageData={messageData}
					/>
				)}
			</div>
		}
	</div>
);

const MessageList = props => {
	const {messageData} = props;
	const message = messageData.message;

	return (
		<div className={classNames(style['message-list'], props.className)}>
			<div className={classNames({[style['message-inner']]: true})}>
				<div className={style['message-avatar']}>
					<Avatar
						user={messageData.users[message.authorID]}
						size={40}
					/>
				</div>
				<div className={style['message-right']}>
					<div className={style['message-header']}>
						<div
							className={style['message-poster']}
							style={{color: getMemberColor(message.authorID, messageData)}}
						>
							{getMemberName(message.authorID, messageData)}
						</div>
						<div className={style['message-timestamp']}>
							{formatTimestamp(message.createdTimestamp)}
						</div>
					</div>
					<div className={style['message-bodies']}>
						<MessageContents
							message={message}
							messageData={messageData}
						/>
					</div>
				</div>
			</div>
		</div>
	);
};

export default memo(MessageList);
