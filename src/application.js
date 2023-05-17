import './styles/style.css';
import 'bootstrap/dist/css/bootstrap.css';
import axios, { AxiosError } from 'axios';
import i18next from 'i18next';
import * as yup from 'yup';
import makeWatchedState from './view.js';
import ru from './assets/locales/index.js';
import makeUniqueIdGenerator from './assets/helpers/uniqueIdGenerator.js';
import parseRss from './assets/helpers/parser.js';

const uniqueFeedIdGenerator = makeUniqueIdGenerator();
const uniquePostIdGenerator = makeUniqueIdGenerator();

const i18nInstance = i18next.createInstance();
i18nInstance.init({
  fallbackLng: 'ru',
  resources: {
    ru,
  },
});

yup.setLocale({
  string: {
    url: 'form.messages.errors.invalid',
  },
  mixed: {
    notOneOf: 'form.messages.errors.nonUnique',
  },
});

const state = {
  form: {
    status: 'idle',
    message: {
      key: '',
      type: '',
    },
  },
  fetch: '',
  data: {
    feeds: [],
    posts: [],
  },
};

const watchedState = makeWatchedState(state, i18nInstance);

const buildSchema = (feeds) => yup
  .string()
  .url()
  .notOneOf(feeds.map(({ link }) => link));
const validateLink = (link, schema) => schema.validate(link);

export default () => {
  const form = document.querySelector('.rss-form');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const newLink = data.get('url').trim();
    const validationResult = validateLink(newLink, buildSchema(watchedState.data.feeds));
    const newFeedId = uniqueFeedIdGenerator();
    validationResult
      .then((link) => {
        watchedState.fetch = 'filling';
        return axios.get(`https://allorigins.hexlet.app/get?disableCache=true&url=${link}`);
      })
      .then((responce) => responce.data.contents)
      .then((rawData) => {
        if (rawData === '') {
          throw new AxiosError('form.messages.errors.noRss');
        }
        watchedState.fetch = 'filled';
        const parsedRss = parseRss(rawData, newFeedId);
        const postsDataWithIds = parsedRss.posts.map((post) => {
          const postId = getNextUniquePostId();
          return {
            ...post,
            id: postId,
            processedAt: Date.now(),
          };
        });
        parsedRss.posts = postsDataWithIds;
        return parsedRss;
      })
      .then(({ feed, posts }) => {
        const fullFeedData = { link: newLink, ...feed };
        watchedState.data.feeds[newFeedId] = fullFeedData;
        watchedState.data.posts = [...state.data.posts, ...posts];
        watchedState.form.status = 'updated';
        watchedState.form.message = { key: 'form.messages.success', type: 'success' };
      })
      .catch((err) => {
        switch (err.name) {
          case 'ValidationError':
            watchedState.form.status = 'invalid';
            watchedState.form.message = { key: err.message };
            break;
          case 'AxiosError':
            watchedState.fetch = 'failed';
            watchedState.form.message = { key: err.message };
            break;
          case 'SyntaxError':
            if (err.message.endsWith('noRss')) {
              watchedState.fetch = 'failed';
              watchedState.form.message = { key: err.message };
              break;
            } else {
              throw err;
            }
          default:
            console.log(err, JSON.stringify(err));
        }
      });
  });
};
