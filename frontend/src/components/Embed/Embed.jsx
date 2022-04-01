import style from './style.module.scss';

import Markdown from '../Markdown/Markdown';
import MessageImage from '../MessageImage/MessageImage';

import classNames from 'classnames';

const hasOwn = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);

const Embed = ({embed, messageData}) => {
	const isRich = ['title', 'description', 'color', 'footer', 'image', 'provider', 'author', 'fields']
		.some(prop => embed[prop]);

	if (!isRich) {
		if (embed.type === 'image') {
			if (embed.thumbnail) {
				return <MessageImage
					width={embed.thumbnail.width}
					height={embed.thumbnail.height}
					src={embed.thumbnail.proxyURL || embed.thumbnail.url}
					link={embed.thumbnail.url}
				/>;
			}
			return <MessageImage src={embed.image} />;
		}
		return null;
	}

	let pillColor = null;
	if (embed.color !== null) {
		pillColor = '#' + ('000000' + embed.color.toString(16)).slice(-6);
	}

	let fieldCols;
	if (embed.fields && embed.fields.length > 0) {
		fieldCols = [];

		const fieldRuns = [];

		let acc = 0;
		for (let i = 0; i < embed.fields.length; i++) {
			if (i > 0 && (embed.fields[i].inline !== embed.fields[i - 1].inline || !embed.fields[i].inline)) {
				fieldRuns.push(acc);
				acc = 0;
			}
			acc++;
		}
		fieldRuns.push(acc);

		for (let i = 0; i < fieldRuns.length; i++) {
			const colWidth = 12 / fieldRuns[i];

			for (let j = 0; j < fieldRuns[i]; j++) {
				fieldCols.push(`${(j * colWidth) + 1} / ${((j + 1) * colWidth) + 1}`);
			}
		}
	}

	return (
		<div className={style['embed-wrapper']} style={{borderColor: pillColor}} data-dbg={JSON.stringify(embed)}>
			<div className={classNames({
				[style['embed-inner']]: true,
				[style['has-thumbnail']]: !!embed.thumbnail
			})}>
				{embed.provider ?
					<div className={style['embed-provider']}>
						{hasOwn(embed.provider, 'url') ?
							<a
								href={embed.provider.url}
								rel="noopener noreferrer"
								target="_blank">{embed.provider.name}</a> :
							embed.provider.name}
					</div> :
					null}

				{embed.author && embed.author.name ?
					<div className={style['embed-author']}>
						{embed.author.iconURL ?
							<img className={style['embed-author-icon']} src={embed.author.iconURL} alt="Embed author" /> :
							null}

						{embed.author.url ?
							<a
								href={embed.author.url}
								rel="noopener noreferrer"
								className={style['embed-author-name-link']}
								target="_blank">{embed.author.name}</a> :
							embed.author.name}
					</div> :
					null}

				{embed.title ?
					<div className={style['embed-title']}>
						{embed.url ?
							<a
								href={embed.url}
								rel="noopener noreferrer"
								target="_blank"><Markdown removeBreaks text={embed.title} /></a> :
							<Markdown removeBreaks text={embed.title} messageData={messageData} />
						}
					</div> :
					null}

				{embed.description ?
					<div className={style['embed-description']}>
						<Markdown embed text={embed.description} messageData={messageData} />
					</div> :
					null}

				{embed.fields && embed.fields.length > 0 ?
					<div className={style['embed-fields']}>
						{embed.fields.map((field, i) => (
							<div
								className={style['embed-field']}
								style={{gridColumn: fieldCols[i]}}
								key={i}
							>
								<div className={style['embed-field-name']}>
									<Markdown removeBreaks text={field.name} messageData={messageData} />
								</div>
								<div className={style['embed-field-value']}>
									<Markdown embed text={field.value} messageData={messageData} />
								</div>
							</div>
						))}
					</div> :
					null}

				{embed.image && (embed.image.url || embed.image.proxyURL) ?
					<div className={style['embed-image-container']}>
						<MessageImage
							width={embed.image.width}
							height={embed.image.height}
							src={embed.image.proxyURL || embed.image.url}
							link={embed.image.url}
						/>
					</div> :
					null}

				{embed.thumbnail && (embed.thumbnail.url || embed.thumbnail.proxyURL) ?
					<div className={style['embed-thumbnail-container']}>
						<MessageImage
							width={embed.thumbnail.width}
							height={embed.thumbnail.height}
							maxWidth={80}
							maxHeight={80}
							src={embed.thumbnail.proxyURL || embed.thumbnail.url}
							link={embed.thumbnail.url}
						/>
					</div> :
					null}

				{embed.footer && embed.footer.text ?
					<div className={style['embed-footer']}>
						{embed.footer.iconURL || embed.footer.proxyIconURL ?
							<img
								className={style['embed-footer-icon']}
								src={embed.footer.proxyIconURL || embed.footer.iconURL}
								alt="Embed footer"
							/> :
							null}
						<span className={style['embed-footer-text']}>{embed.footer.text}</span>
					</div> :
					null}
			</div>
		</div>
	);
};

export default Embed;
