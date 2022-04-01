import style from './style.module.scss';

import filesize from 'filesize';

import MessageImage from '../MessageImage/MessageImage';

import {isImage, isAudio} from '../../util/file-extensions';

const Attachment = props => {
	return (
		<div className={style.attachment}>
			{
				isImage(props.attachment.url) ?
					<MessageImage
						width={props.attachment.width}
						height={props.attachment.height}
						src={props.attachment.url}
						link={props.attachment.url}
					/> :
					<div className={style['attachment-file']}>
						<div className={style['attachment-filename']}>
							<a href={props.attachment.url}>{props.attachment.name}</a>
							<span className={style['attachment-size']}>{filesize(props.attachment.size)}</span>
						</div>
						{isAudio(props.attachment.url) ? <audio
							controls
							src={props.attachment.url}
							preload="none"
							className={style['attachment-audio']}
						/> : null}
					</div>
			}

		</div>
	);
};

export default Attachment;
