import style from './style.module.scss';

import {Component} from 'react';

class Tooltip extends Component {
	render () {
		return (
			<div
				className={`${style['tooltip']} ${style[this.props.side || 'right']} ` +
					(this.props.className ? `${this.props.className}` : '')}
			>
				{this.props.children}
			</div>
		);
	}
}

export default Tooltip;
