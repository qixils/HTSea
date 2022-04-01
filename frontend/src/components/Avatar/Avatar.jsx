import style from './style.module.scss';

import {Component} from 'react';

class Avatar extends Component {
	constructor (props) {
		super(props);

		this.state = {
			handledError: false
		};

		this.getUserID = this.getUserID.bind(this);
		this.getAvatarURL = this.getAvatarURL.bind(this);
	}

	getUserID () {
		return this.props.userID || this.props.user.id;
	}

	getAvatarURL (size) {
		if (!this.props.user) return `https://cdn.discordapp.com/embed/avatars/0.png`;
		if (!this.props.user.avatar) return `https://cdn.discordapp.com/embed/avatars/${this.props.user.discriminator % 5}.png`;
		return `https://cdn.discordapp.com/avatars/${this.props.user.id}/${this.props.user.avatar}.webp?size=${size}`;
	}

	render () {
		const {props} = this;

		const avatarURL = this.getAvatarURL(props.size);

		return (
			<img
				className={style['avatar']}
				src={avatarURL}
				width={props.size}
				height={props.size}
				style={{width: props.size, height: props.size}}
				alt="Avatar"
			/>
		);
	}
}

export default Avatar;
