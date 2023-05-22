import './styles/style.css';
import 'bootstrap';
import onChange from 'on-change';
import axios, { AxiosError } from 'axios';
import i18next from 'i18next';
import * as yup from 'yup';
import ru from './assets/locales/index';
import makeUniqueIdGenerator from './assets/helpers/uniqueIdGenerator';
import parseRss from './assets/helpers/parser';
import render from './view';

const getNextUniqueFeedId = makeUniqueIdGenerator();
const getNextUniquePostId = makeUniqueIdGenerator();

const routes = {
  pathForRequest: (link) => `https://allorigins.hexlet.app/get?disableCache=true&url=${link}`,
};

yup.setLocale({
  string: {
    url: 'form.messages.errors.invalid',
  },
  mixed: {
    notOneOf: 'form.messages.errors.nonUnique',
  },
});

const buildSchema = (feeds) => yup
  .string()
  .url()
  .notOneOf(feeds.map(({ link }) => link));

const fetchFeed = ({ link }) => axios.get(routes.pathForRequest(link));
const validateLink = (link, schema) => schema.validate(link);

export default () => {
  const elements = {
    form: document.querySelector('.rss-form'),
    input: document.querySelector('#url-input'),
    messageElement: document.querySelector('.feedback'),
    button: document.querySelector('[type=submit]'),
    feeds: document.querySelector('.feeds'),
    posts: document.querySelector('.posts'),
    modal: document.querySelector('#modal'),
  };

  const i18nInstance = i18next.createInstance();
  i18nInstance.init({
    fallbackLng: 'ru',
    resources: {
      ru,
    },
  });

  const state = {
    form: {
      status: 'idle',
      message: {
        key: null,
        type: null,
      },
    },
    fetch: {
      status: null,
      message: {
        key: null,
      },
    },
    data: {
      feeds: [],
      posts: [],
    },
    ui: {
      modal: {
        postId: null,
      },
      viewedPosts: [],
    },
  };

  const watchedState = onChange(state, (path, value) => {
    if (path.startsWith('form.message')) {
      render.formMessage(elements, value, i18nInstance);
    }

    if (path.startsWith('fetch.message')) {
      render.formMessage(elements, { key: value }, i18nInstance);
    }

    if (path === 'form.status') {
      switch (value) {
        case 'invalid':
          elements.input.classList.add('is-invalid');
          break;
        case 'updated':
          elements.button.classList.remove('disabled');
          elements.input.classList.remove('is-invalid');
          elements.form.reset();
          elements.input.focus();
          break;
        case '':
          break;
        default:
          throw new Error(`Unexpected form status: ${value}`);
      }
    }
    if (path === 'fetch.status') {
      switch (value) {
        case 'filling':
          elements.button.classList.add('disabled');
          break;
        case 'filled':
          elements.button.classList.remove('disabled');
          break;
        case 'failed':
          elements.button.classList.remove('disabled');
          break;
        default:
          throw new Error(`Unexpected fetch status: ${value}`);
      }
    }

    if (path.startsWith('data.feeds')) {
      render.feeds(elements, watchedState.data.feeds, i18nInstance);
    }

    if (path.startsWith('data.posts')) {
      render.posts(elements, watchedState, i18nInstance);
    }

    if (path.startsWith('ui.modal')) {
      render.modal(elements, value, watchedState);
    }

    if (path.startsWith('ui.viewedPosts')) {
      render.viewedPosts(elements, watchedState.ui.viewedPosts);
    }
  });

  elements.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const newLink = data.get('url').trim();
    const validationResult = validateLink(newLink, buildSchema(watchedState.data.feeds));
    const newFeedId = getNextUniqueFeedId();
    validationResult
      .then((link) => {
        watchedState.fetch.status = 'filling';
        return axios.get(routes.pathForRequest(link));
      })
      .then((responce) => {
        if (responce.data.contents === '') {
          throw new AxiosError('form.messages.errors.noRss');
        }
        return responce.data.contents;
      })
      .then((rawData) => {
        watchedState.fetch.status = 'filled';
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
        watchedState.form.status = '';
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
            if (err.code === 'ERR_NETWORK') {
              watchedState.fetch.status = 'failed';
              watchedState.fetch.message.key = 'form.messages.errors.network';
              break;
            }
            watchedState.fetch.status = 'failed';
            watchedState.fetch.message.key = 'form.messages.errors.noRss';
            break;
          case 'SyntaxError':
            if (err.message.endsWith('noRss')) {
              watchedState.fetch.status = 'failed';
              watchedState.fetch.message.key = 'form.messages.errors.noRss';
              break;
            } else {
              throw err;
            }
          default:
            watchedState.fetch = {
              status: 'failed',
              message: err.message,
            };
            console.log(err, JSON.stringify(err));
        }
      });
  });

  elements.modal.addEventListener('show.bs.modal', (e) => {
    const postId = e.relatedTarget.dataset.id;
    watchedState.ui.modal.postId = postId;
    watchedState.ui.viewedPosts.push(Number(postId));
  });

  const delayFunctionExecuteRepeat = (fetch) => {
    if (state.data.feeds.length > 0) {
      const promises = state.data.feeds.map((feed) => fetch(feed));

      Promise.all(promises)
        .then((responces) => responces.map((responce, id) => parseRss(responce.data.contents, id)))
        .then((parsedResponces) => parsedResponces.map((data) => data.posts))
        .then((actualPostsInAllFeeds) => {
          actualPostsInAllFeeds.forEach((actualPostsInFeed) => {
            const knownPostsLinks = state.data.posts.map((post) => post.link);
            const newPosts = actualPostsInFeed
              .filter(({ link }) => !knownPostsLinks.includes(link));
            if (newPosts.length > 0) {
              const postsDataWithIds = newPosts.map((post) => {
                const postId = getNextUniquePostId();
                return {
                  ...post,
                  id: postId,
                  processedAt: Date.now(),
                };
              });
              watchedState.data.posts = [...state.data.posts, ...postsDataWithIds];
            }
          });
        })
        .then(() => {
          setTimeout(delayFunctionExecuteRepeat, 5000, fetch);
        })
        .catch((err) => {
          console.log(err);
          setTimeout(delayFunctionExecuteRepeat, 5000, fetch);
        });
    } else {
      setTimeout(delayFunctionExecuteRepeat, 5000, fetch);
    }
  };
  delayFunctionExecuteRepeat(fetchFeed);
};
