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

const validateLink = (link, schema) => schema.validate(link);

export default () => {
  const elements = {
    body: document.body,
    form: document.querySelector('.rss-form'),
    input: document.querySelector('#url-input'),
    messageElement: document.querySelector('.feedback'),
    submitButton: document.querySelector('[type=submit]'),
    feeds: document.querySelector('.feeds'),
    posts: document.querySelector('.posts'),
    modal: document.querySelector('#modal'),
    backdrop: document.querySelector('#backdrop'),
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
    feeds: [],
    posts: [],
    ui: {
      modal: {
        status: 'hidden',
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
      case 'feeds':
        render.feeds(elements, watchedState.feeds, i18nInstance);
        break;
      case 'posts':
        render.posts(elements, watchedState, i18nInstance);
        break;
      case 'ui.modal.status':
        render.modal(elements, value);
        break;
      case 'ui.modal.postId':
        render.modalContent(elements, value, watchedState);
        break;
      case 'ui.viewedPosts':
        render.viewedPosts(elements, watchedState.ui.viewedPosts);
        break;
      default:
        console.error(`Unexpected state path: ${path}`);
    }
  });

  elements.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newLink = formData.get('url').trim();
    const validationResult = validateLink(newLink, buildSchema(watchedState.feeds));
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
        watchedState.feeds = [...state.feeds, feed];
        watchedState.posts = [...state.posts, ...posts];
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
            if (err.message === 'errors.noRss') {
              watchedState.fetch.status = 'failed';
              watchedState.fetch.message.key = 'errors.noRss';
            } else {
              throw err;
            }
            break;
          default:
            watchedState.fetch.status = 'failed';
            watchedState.fetch.message.key = err.message;
            console.log(err, JSON.stringify(err));
        }
      });
  });

  elements.posts.addEventListener('click', (e) => {
    const { target } = e;
    const { id, type: kindOfElement } = target.dataset;
    if (kindOfElement === 'link' || kindOfElement === 'button') {
      watchedState.ui.viewedPosts.push(Number(id));
    }

    if (target.dataset.type === 'button') {
      watchedState.ui.modal.postId = id;
      watchedState.ui.modal.status = 'shown';
    }
  });

  elements.modal.addEventListener('click', (e) => {
    const { target, target: { type } } = e;
    if (type === 'button' || target === elements.modal) {
      watchedState.ui.modal.status = 'hidden';
    }
  });

  const REFRESHING_DELAY_IN_MS = 5000;

  const infiniteFeedsRefreshingWithDelay = () => {
    const promises = state.feeds.map(({ link }) => axios.get(routes.pathForRequest(link)));

    Promise.allSettled(promises)
      .then((responces) => responces
        .map((responce) => parseRss(responce.value.data.contents)))
      .then((parsedResponces) => parsedResponces
        .map((data) => data.channel.items))
      .then((actualPostsInAllFeeds) => {
        actualPostsInAllFeeds.forEach((actualPostsInFeed, feedId) => {
          const knownPostsLinks = state.posts.map((post) => post.link);
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
            watchedState.posts = [...state.posts, ...postsDataWithIds];
          }
        });
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        setTimeout(infiniteFeedsRefreshingWithDelay, REFRESHING_DELAY_IN_MS);
      });
  };
  infiniteFeedsRefreshingWithDelay();
};
