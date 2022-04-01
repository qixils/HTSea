import './colors.module.scss';
import style from './index.module.css';

import React from 'react';
import ReactDOM from 'react-dom';
import reportWebVitals from './reportWebVitals';
import {BrowserRouter, Routes, Route} from "react-router-dom";
import {createStore, applyMiddleware} from 'redux';
import thunkMiddleware from 'redux-thunk';
import {Provider} from 'react-redux';

import App from './App';
import ErrorBanner from './components/ErrorBanner/ErrorBanner';
import MessagePage from './components/MessagePage/MessagePage';
import UserPage from './components/UserPage/UserPage';
import Navbar from './components/Navbar/Navbar';
import Wordle from './components/Wordle/Wordle';
import RecentTransactions from './components/RecentTransactions/RecentTransactions';

import rootReducer from './redux/reducer';
const store = createStore(rootReducer(), applyMiddleware(thunkMiddleware));

ReactDOM.render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <Navbar />
        <div className={style.main}>
          <ErrorBanner />
          <Routes>
            <Route path="/" element={<App />} /> 
            <Route path="wordle" element={<Wordle />} /> 
            <Route path="activity" element={<RecentTransactions />} />
            <Route path="messages/:id" element={<MessagePage />} />
            <Route path="user/:id" element={<UserPage />} />
          </Routes>
        </div>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
  document.getElementById('root')
);

reportWebVitals();
