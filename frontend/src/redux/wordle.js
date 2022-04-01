import api from '../util/api';

export const WORDLE_IDLE = 'WORDLE_IDLE';
export const WORDLE_UPDATING = 'WORDLE_UPDATING';
export const WORDLE_SUCCESS = 'WORDLE_SUCCESS';
// used for expected failure modes (you tried to guess a word that isn't a word, etc)
export const WORDLE_FAILURE = 'WORDLE_FAILURE';
// used for unexpected failure modes
export const WORDLE_ERROR = 'WORDLE_ERROR';

function wordleUpdating(guess) {
    return {
        type: WORDLE_UPDATING,
        guess
    }
}

function wordleSuccess({cooldown, guesses, diamonds}) {
    return {
        type: WORDLE_SUCCESS,
        cooldown,
        guesses,
        diamonds
    }
}

function wordleFailure(failure) {
    return {
        type: WORDLE_FAILURE,
        failure
    }
}

function wordleError(error) {
    return {
        type: WORDLE_ERROR,
        error
    }
}

export const initialState = {
    status: WORDLE_IDLE
};

const wordleReducer = (state, action) => {
    switch (action.type) {
        case WORDLE_IDLE:
        case WORDLE_UPDATING: {
            return {
                ...state,
                wordle: {
                    ...state.wordle,
                    status: action.type,
                    guess: action.guess
                }
            }
        }
        case WORDLE_SUCCESS: {
            return {
                ...state,
                wordle: {
                    ...state.wordle,
                    error: null,
                    status: action.type,
                    guesses: action.guesses,
                    cooldown: action.cooldown,
                },
                diamonds: action.diamonds
            }
        }
        case WORDLE_FAILURE: {
            return {
                ...state,
                wordle: {
                    ...state.wordle,
                    status: action.type,
                    failure: action.failure
                }
            }
        }
        case WORDLE_ERROR: {
            return {
                ...state,
                wordle: {
                    ...state.wordle,
                    status: action.type,
                    error: action.error
                }
            }
        }
        default: return state;
    }
}

const getWordleInfo = dispatch => {
    dispatch(wordleUpdating());
    api('/api/wordle/info')
        .then(res => {
            dispatch(wordleSuccess(res));
        })
        .catch(err => {
            dispatch(wordleError(err));
        });
};

const guess = (dispatch, value) => {
    dispatch(wordleUpdating(value));
    api('/api/wordle/guess', {
        method: 'post',
        params: {
            guess: value
        }
    })
        .then(res => {
            if (res.success) {
                dispatch(wordleSuccess(res.new_state, value));
            } else {
                dispatch(wordleFailure(res.error));
            }
        })
        .catch(err => {
            dispatch(wordleError(err));
        });
}

export {wordleReducer, getWordleInfo, guess};
