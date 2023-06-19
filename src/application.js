import onChange from 'on-change';
import axios, { AxiosError } from 'axios';
import i18next from 'i18next';
import * as yup from 'yup';
import ru from './assets/locales/index';
import makeUniqueIdGenerator from './assets/helpers/uniqueIdGenerator';
import parseRss from './assets/helpers/parser';
import render from './view';

const formStatus = {
  FILLING: 'filling',
  INVALID: 'invalid',
  VALID: 'valid',
};
const fetchStatus = {
  WAITING: 'waiting',
  LOADING: 'loading',
  SUCCESSFULLY: 'successfully',
  FAILED: 'failed',
};

const statusesWithMessages = [
  formStatus.INVALID,
  fetchStatus.SUCCESSFULLY,
  fetchStatus.FAILED,
];

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

  yup.setLocale({
    string: {
      url: 'invalidUrl',
    },
    mixed: {
      notOneOf: 'nonUniqueUrl',
    },
  });

  i18next.createInstance().init({
    fallbackLng: 'ru',
    resources: {
      ru,
    },
  }).then((i18n) => {
    const state = {
      form: {
        status: formStatus.FILLING,
        error: null,
      },
      fetch: {
        status: fetchStatus.WAITING,
        error: null,
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

    const watchedState = onChange(state, (path) => {
      switch (path) {
        case 'form':
          render.form(elements, state);
          if (statusesWithMessages.includes(state.form.status)) {
            render.formMessage(elements, state, path, i18n);
          }
          break;
        case 'fetch':
          render.buttonAndForm(elements, state);
          if (statusesWithMessages.includes(state.fetch.status)) {
            render.formMessage(elements, state, path, i18n);
          }
          break;
        case 'feeds':
          render.feeds(elements, state, i18n);
          break;
        case 'posts':
          render.posts(elements, state, i18n);
          break;
        case 'ui.modal.status':
          render.modal(elements, state);
          break;
        case 'ui.modal.postId':
          render.modalContent(elements, state);
          break;
        case 'ui.viewedPosts':
          render.viewedPosts(elements, state);
          break;
        default:
          break;
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
          watchedState.form = {
            status: formStatus.VALID,
            error: null,
          };
          watchedState.fetch = {
            status: fetchStatus.LOADING,
            error: null,
          };
          return axios.get(routes.pathForRequest(link));
        })
        .then((responce) => {
          if (responce.data.contents === '') {
            throw new AxiosError('noRss');
          }
          const rawData = responce.data.contents;
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

          const { feed, posts } = fullData;
          watchedState.feeds = [...state.feeds, feed];
          watchedState.posts = [...state.posts, ...posts];
          watchedState.fetch = {
            status: fetchStatus.SUCCESSFULLY,
            error: null,
          };
          watchedState.form = {
            status: formStatus.FILLING,
            error: null,
          };
        })
        .catch((err) => {
          switch (err.name) {
            case 'ValidationError':
              watchedState.form = {
                status: formStatus.INVALID,
                error: err.message,
              };
              break;
            case 'AxiosError':
              if (err.code === 'ERR_NETWORK') {
                watchedState.fetch = {
                  status: fetchStatus.FAILED,
                  error: 'noInternet',
                };
                break;
              }
              watchedState.fetch = {
                status: fetchStatus.FAILED,
                error: err.message,
              };
              break;
            case 'SyntaxError':
              if (err.message === 'noRss') {
                watchedState.fetch = {
                  status: fetchStatus.FAILED,
                  error: err.message,
                };
              } else {
                throw err;
              }
              break;
            default:
              console.log(`Unexpected process error: ${err.message}`);
              watchedState.fetch = {
                status: fetchStatus.FAILED,
                error: err.message,
              };
          }
        })
        .finally(() => {
          watchedState.fetch.status = fetchStatus.WAITING;
        });
    });
    elements.posts.addEventListener('click', (e) => {
      const { target } = e;
      const { postId, markAsVisited } = target.dataset;
      if (markAsVisited) {
        watchedState.ui.viewedPosts.push(Number(postId));
      }
      if (target.dataset.action === 'openModal') {
        watchedState.ui.modal.postId = postId;
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
      const feedRequests = state.feeds.map(({ link }) => axios.get(routes.pathForRequest(link)));

      Promise.allSettled(feedRequests)
        .then((responces) => responces
          .map((responce) => parseRss(responce.value.data.contents))
          .map((data) => data.channel.items)
          .forEach((actualPostsInFeed, feedId) => {
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
          }))
        .finally(() => {
          setTimeout(infiniteFeedsRefreshingWithDelay, REFRESHING_DELAY_IN_MS);
        });
    };
    infiniteFeedsRefreshingWithDelay();
  });
};
