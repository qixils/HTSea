import style from './style.module.scss';

import {Component} from 'react';
import {connect} from 'react-redux';
import classNames from 'classnames';

import {getWordleInfo, guess, WORDLE_FAILURE, WORDLE_IDLE, WORDLE_UPDATING} from '../../redux/wordle';

import api from '../../util/api';

const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
const alphabet = new Set(letters);
const initialKeyboardState = {};
for (const letter of letters) {
    initialKeyboardState[letter] = '?';
}

const KeyboardKey = ({letter, score, onKeyClick}) => {
    return (
        <div className={classNames(
            style.key,
            {
                [style['special-key']]: letter === 'ENTER' || letter === '⌫',
                [style.incorrect]: score === 'x',
                [style['wrong-position']]: score === 'y',
                [style.correct]: score === 'g'
            })
        } onClick={() => onKeyClick(letter)}>{letter}</div>
    )
};

const Keyboard = ({scores, onKeyClick}) => {
    const rows = [
        ["q","w","e","r","t","y","u","i","o","p"],
        ["a","s","d","f","g","h","j","k","l"],
        ["ENTER", "z","x","c","v","b","n","m", "⌫"]
    ];

    return (
        <div className={style.keyboard}>
            {rows.map((row, i) => (
                <div className={style['keyboard-row']} key={i}>
                    {row.map(letter => <KeyboardKey letter={letter} key={letter} onKeyClick={onKeyClick} score={scores[letter]} />)}
                </div>
            ))}
        </div>
    )
}

class Wordle extends Component {
    constructor (props) {
        super(props);

        this.state = {
            guess: '',
            cooldownRemaining: null
        };

        this.onGuess = this.onGuess.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyClick = this.onKeyClick.bind(this);
        this.tick = this.tick.bind(this);

        this.cooldownInterval = null;
    }

    isDisabled () {
        return (
            this.state.cooldownRemaining > 0 ||
            this.props.wordle.status === WORDLE_IDLE ||
            this.props.wordle.status === WORDLE_UPDATING
        );
    }

    onGuess (event) {
        api('/api/wordle/guess', {
            method: 'post',
            params: {
                guess: 'anger'
            }
        })
            .then(res => res.json())
    }

    // remove last letter from guess
    backspace () {
        this.setState(state => ({
            guess: state.guess.slice(0, -1)
        }));
    }

    enter () {
        if (this.state.guess.length === 5) {
            this.props.guess(this.state.guess);
        }
    }

    alphabetKey (letter) {
        if (!alphabet.has(letter)) return;
        this.setState(state => {
            if (state.guess.length === 5) return state;
            return {
                guess: state.guess + letter
            };
        });
    }
    onKeyDown (event) {
        if (this.isDisabled()) return;
        switch (event.code) {
            case 'Backspace': {
                this.backspace();
                break;
            }
            case 'Enter': {
                this.enter();
                break;
            }
            default: {
                this.alphabetKey(event.key);
                break;
            }
        }
    }

    onKeyClick (key) {
        if (this.isDisabled()) return;
        switch (key) {
            case '⌫': {
                this.backspace();
                break;
            }
            case 'ENTER': {
                this.enter();
                break;
            }
            default: {
                this.alphabetKey(key);
                break;
            }
        }
    }

    componentDidUpdate (prevProps, prevState) {
        // reset guess when we've input one
        if (prevProps.wordle?.guesses?.length !== this.props.wordle?.guesses?.length) {
            this.setState({guess: ''});
        }

        // a cooldown was just set--create an interval handler
        if (this.props.wordle.cooldown && this.cooldownInterval === null) {
            this.tick();
            this.cooldownInterval = window.setInterval(this.tick, 1000);
        }
    }

    // update the "next puzzle in X secs" overlay
    tick () {
        const cooldownEnd = this.props.wordle.cooldown * 1000;
        const msRemaining = cooldownEnd - Date.now();
        this.setState({
            cooldownRemaining: msRemaining > 0 ? msRemaining : null
        });

        // once the next puzzle is ready, fetch the new puzzle state/info
        // if there's some clock skew, that doesn't matter--the cooldown will
        // come back as still existing and we'll just re-create the interval
        if (msRemaining <= 0) {
            window.clearInterval(this.cooldownInterval);
            this.cooldownInterval = null;
            this.props.getWordleInfo();
        }
    }

    componentDidMount () {
        if (this.props.wordle.cooldown) {
            this.cooldownInterval = window.setInterval(this.tick, 1000);
        }
    }

    componentWillUnmount () {
        if (this.cooldownInterval) {
            window.clearInterval(this.cooldownInterval);
        }
    }

    render () {
        if (this.props.wordle.status === WORDLE_IDLE) {
            this.props.getWordleInfo();
        }

        const guesses = this.props.wordle?.guesses || [];

        const rows = [];
        for (let i = 0; i < 6; i++) {
            const row = [];
            for (let j = 0; j < 5; j++) {
                const letter = i < guesses.length ?
                    guesses[i].word[j] :
                    i === guesses.length && j < this.state.guess.length ?
                        this.state.guess[j] :
                        '';
                const score = i < guesses.length ? guesses[i].result[j] : '';
                row.push(
                    <div
                        className={classNames(style.cell, {
                            [style['has-letter']]: score === '' && letter !== '',
                            [style.incorrect]: score === 'x',
                            [style['wrong-position']]: score === 'y',
                            [style.correct]: score === 'g',
                        })}
                        key={j}
                    >{letter}</div>
                )
            }
            const notAWord = this.props.wordle.status === WORDLE_FAILURE &&
                this.props.wordle.failure === 'NOT_A_WORD' &&
                i === guesses.length &&
                this.state.guess === this.props.wordle.guess;
            rows.push(
                <div className={classNames(style.row, {[style['not-a-word']]: notAWord})} key={notAWord ? Math.random() : i}>
                    {row}
                </div>
            )
        }

        let tryAgainOverlay = null;
        if (this.state.cooldownRemaining) {
            tryAgainOverlay = (<div className={style['try-again']}>
                Next puzzle in {Math.ceil(this.state.cooldownRemaining / 1000)} seconds
            </div>);
        }

        const keyboardState = Object.assign({}, initialKeyboardState);
        for (const guess of guesses) {
            for (let i = 0; i < 5; i++) {
                const guessLetter = guess.word[i];
                const guessScore = guess.result[i];
                if (guessScore === 'x') {
                    keyboardState[guessLetter] = 'x';
                    continue;
                }

                if (guessScore === 'y' && keyboardState[guessLetter] === '?') {
                    keyboardState[guessLetter] = 'y';
                    continue;
                }

                if (guessScore === 'g') {
                    keyboardState[guessLetter] = 'g';
                    continue;
                }
            }
        }

        return (
            <div onKeyDown={this.onKeyDown} tabIndex="0" className={style.wordle}>
                <div className={style['grid-wrapper']}>
                    <div className={style.grid}>
                        {rows}
                    </div>
                    {tryAgainOverlay}
                </div>
                <div className={style['keyboard-wrapper']}>
                    <Keyboard onKeyClick={this.onKeyClick} scores={keyboardState} />
                </div>
            </div>
        );
    }
}

const mapStateToProps = state => {
    return {
        wordle: state.wordle
    };
}

const mapDispatchToProps = dispatch => ({
    getWordleInfo: () => dispatch(getWordleInfo),
    guess: (value) => guess(dispatch, value)
});

export default connect(mapStateToProps, mapDispatchToProps)(Wordle);