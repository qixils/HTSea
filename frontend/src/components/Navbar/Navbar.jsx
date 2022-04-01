import style from './style.module.scss';
import diamond from '../../icons/diamond.png';

import {Component} from 'react';
import {connect} from 'react-redux';
import {Link} from 'react-router-dom';
import classNames from 'classnames';

import {getSession, SESSION_IDLE, SESSION_SUCCESS} from '../../redux/session';

const loginURL = `https://discord.com/oauth2/authorize?response_type=code&client_id=${process.env.REACT_APP_CLIENT_ID}&scope=identify%20guilds&redirect_uri=${process.env.REACT_APP_API_URL}/api/users/register&prompt=consent`;

class Navbar extends Component {
    render () {
        if (this.props.session.status === SESSION_IDLE) {
            this.props.getSession();
        }

        let user = null;
        if (this.props.session.status === SESSION_SUCCESS && this.props.session.session.logged_in) {
            user = this.props.session.session.user;
        }

        return (
            <div className={style.navbar}>
                <Link to="/" className={classNames(style['nav-link'], style['main-link'])}>HTSea</Link>
                <Link to="/wordle" className={style['nav-link']}>Wordle</Link>
                {user ?
                    <div className={style.user}>
                        <img className={style.avatar} alt="" src={user.avatar} width="32" height="32" />
                        <span className={style.username}>{user.name}</span>
                        <span className={style.discriminator}>#{user.discriminator}</span>
                        <div className={style.diamonds}>
                            <img className={style['diamond-icon']} src={diamond} width="24" height="26" alt="Diamonds" />
                            {this.props.diamonds}
                        </div>
                    </div> :
                    <a className={classNames(style['nav-link'], style.login)} href={loginURL}>Log in via Discord</a>}
            </div>
        );
    }
}

const mapStateToProps = state => {
    return {
        session: state.session,
        diamonds: state.diamonds
    };
}

const mapDispatchToProps = dispatch => ({
    getSession: () => dispatch(getSession)
});

export default connect(mapStateToProps, mapDispatchToProps)(Navbar);