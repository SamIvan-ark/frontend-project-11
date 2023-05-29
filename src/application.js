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
  pathForRequest: (link) => {
    const url = new URL('https://allorigins.hexlet.app/get');
    url.searchParams.set('disableCache', true);
    url.searchParams.set('url', link);
    return url;
  },
};

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
    submitButton: document.querySelector('[type=submit]'),
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

  yup.setLocale({
    string: {
      url: 'errors.invalidUrl',
    },
    mixed: {
      notOneOf: 'errors.nonUnique',
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
    switch (path) {
      case 'form.message':
        render.formMessage(elements, value, i18nInstance);
        break;
      case 'fetch.message.key':
        render.formMessage(elements, { key: value }, i18nInstance);
        break;
      case 'form.status':
        render.formStatus(elements, state);
        break;
      case 'fetch.status':
        render.buttonStatus(elements, state);
        break;
      case 'data.feeds':
        render.feeds(elements, watchedState.data.feeds, i18nInstance); // вынести на уровень повыше
        break;
      case 'data.posts':
        render.posts(elements, watchedState, i18nInstance);//          // вынести на уровень повыше
        break;
      case 'ui.modal.postId':
        render.modal(elements, value, watchedState);
        break;
      case 'ui.viewedPosts':
        render.viewedPosts(elements, watchedState.ui.viewedPosts);
        break;
      default:
        console.error(`Unexpected state path: ${path}`);
        break;
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
          throw new AxiosError('errors.noRss');
        }
        return responce.data.contents;
      })
      .then((rawData) => {
        watchedState.fetch.status = 'filled';
        const { channel: { title, description, items } } = parseRss(rawData);
        const fullPostsData = items.map((post) => {
          const id = getNextUniquePostId();
          return {
            ...post,
            id,
            feedId: newFeedId,
            processedAt: Date.now(),
          };
        });
        const fullData = {
          feed: {
            link: newLink,
            id: newFeedId,
            title,
            description,
          },
          posts: fullPostsData,
        };
        return fullData;
      })
      .then(({ feed, posts }) => {
        watchedState.data.feeds = [...state.data.feeds, feed];
        watchedState.data.posts = [...state.data.posts, ...posts];
        watchedState.form.status = '';
        watchedState.form.status = 'updated';
        watchedState.form.message = { key: 'success', type: 'success' };
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
              watchedState.fetch.message.key = 'errors.network';
              break;
            }
            watchedState.fetch.status = 'failed';
            watchedState.fetch.message.key = 'errors.noRss';
            break;
          case 'SyntaxError':
            if (err.message.endsWith('noRss')) {
              watchedState.fetch.status = 'failed';
              watchedState.fetch.message.key = 'errors.noRss';
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

    Promise.allSettled(promises)
      .then((responces) => responces
        .map((responce) => parseRss(responce.value.data.contents)))
      .then((parsedResponces) => parsedResponces
        .map((data) => data.channel.items))
      .then((actualPostsInAllFeeds) => {
        actualPostsInAllFeeds.forEach((actualPostsInFeed, feedId) => {
          const knownPostsLinks = state.data.posts.map((post) => post.link);
          const newPosts = actualPostsInFeed
            .filter(({ link }) => !knownPostsLinks.includes(link));
          if (newPosts.length > 0) {
            const postsDataWithIds = newPosts.map((post) => {
              const id = getNextUniquePostId();
              return {
                ...post,
                id,
                feedId,
                processedAt: Date.now(),
              };
            });
            watchedState.data.posts = [...state.data.posts, ...postsDataWithIds];
          }
        });
    } else {
      setTimeout(delayFunctionExecuteRepeat, 5000, fetch);
    }
  };
  delayFunctionExecuteRepeat(fetchFeed);
};
