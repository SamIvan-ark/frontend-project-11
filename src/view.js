const generateContentWrapper = (title) => {
  const wrapper = document.createElement('DIV');
  wrapper.classList.add('card', 'border-0');
  wrapper.innerHTML = `<div class="card-body"><h2 class="card-title h4">${title}</h2></div>`;

  const ul = document.createElement('UL');
  ul.classList.add('list-group', 'border-0', 'rounded-0');

  return { wrapper, ul };
};

const renderFormMessage = (elements, state, initiator, i18n) => {
  const mapOfFromMessages = {
    noRss: 'form.messages.errors.noRss',
    noInternet: 'form.messages.errors.network',
    nonUniqueUrl: 'form.messages.errors.nonUnique',
    invalidUrl: 'form.messages.errors.invalidUrl',
    success: 'form.messages.success',
  };
  const { error } = state[initiator];
  const messageType = (initiator === 'fetch' && error === null) ? 'success' : 'danger';
  const messageKey = error ?? 'success';
  const { messageElement } = elements;

  messageElement.innerHTML = '';
  messageElement.classList.remove('text-success');
  messageElement.classList.remove('text-danger');
  messageElement.classList.add(`text-${messageType}`);

  messageElement.textContent = i18n(mapOfFromMessages[messageKey]);
};

const renderFormStatus = (elements, state) => {
  switch (state.form.status) {
    case 'invalid':
      elements.input.classList.add('is-invalid');
      break;
    case 'dropped':
      elements.form.reset();
      elements.input.focus();
      break;
    case 'filling':
      break;
    case 'valid':
      elements.input.classList.remove('is-invalid');
      break;
    default:
      throw new Error(`Unexpected form status: ${state.form.status}`);
  }
};

const renderButtonStatus = (elements, state) => {
  switch (state.fetch.status) {
    case 'loading':
      elements.submitButton.classList.add('disabled');
      break;
    case 'successfully':
      elements.submitButton.classList.remove('disabled');
      break;
    case 'failed':
      elements.submitButton.classList.remove('disabled');
      break;
    case 'waiting':
      break;
    default:
      throw new Error(`Unexpected fetch status: ${state.fetch.status}`);
  }
};

const renderFeeds = (elements, state, i18n) => {
  const { feeds: feedsData } = state;
  const { feeds: feedsWrapper } = elements;
  feedsWrapper.innerHTML = '';

  const { wrapper, ul } = generateContentWrapper(i18n('content.feeds.title'));
  feedsData.forEach(({ title, description }) => {
    const li = document.createElement('LI');
    li.classList.add('list-group-item', 'border-0', 'border-end-0');

    li.innerHTML = `<h3 class="h6 m-0">${title}</h3> <p class="m-0 small text-black-50">${description}</p>`;
    ul.appendChild(li);
  });

  feedsWrapper.appendChild(wrapper);
  feedsWrapper.appendChild(ul);
};

const renderModal = (elements, modalStatus) => {
  const { modal, body, backdrop } = elements;

  switch (modalStatus) {
    case 'hidden':
      body.classList.remove('modal-open');
      body.removeAttribute('style');
      backdrop.classList.remove('modal-backdrop', 'show');
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
      modal.removeAttribute('aria-modal');
      modal.setAttribute('style', 'display: none');
      break;
    case 'shown':
      body.classList.add('modal-open');
      body.setAttribute('style', 'overflow: hidden, padding-right: 19px');
      backdrop.classList.add('modal-backdrop', 'show');
      modal.classList.add('show');
      modal.removeAttribute('aria-hidden');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('style', 'display: block');
      break;
    default:
      throw new Error(`unexpected modal status: ${modalStatus}`);
  }
};

const renderModalContent = (elements, id, state) => {
  const targetPost = state.posts.filter((post) => Number(post.id) === Number(id))[0];
  const { title, description, link } = targetPost;
  const { modal } = elements;
  const header = modal.querySelector('.modal-title');
  header.textContent = title;

  const modalBody = modal.querySelector('.modal-body');
  modalBody.innerHTML = `<p>${description}</p>`;

  const readMoreButton = modal.querySelector('.modal-footer > a');
  readMoreButton.setAttribute('href', link);
};

const renderViewedPosts = (elements, list) => {
  const { posts } = elements;
  const renderedPosts = posts.getElementsByTagName('LI');
  const viewedPosts = Array.from(renderedPosts).filter((post) => {
    const currentId = Number(post.querySelector('A').dataset.id);
    return list.includes(currentId);
  });

  viewedPosts.forEach((post) => {
    const titleElement = post.querySelector('A');
    titleElement.classList.remove('fw-bold');
    titleElement.classList.add('fw-normal', 'link-secondary');
  });
};

const renderPosts = (elements, state, i18n) => {
  const { posts } = elements;
  posts.innerHTML = '';
  const cloneOfPostsData = [].concat(state.posts);
  const sortedPostsData = cloneOfPostsData
    .sort((a, b) => new Date(b.processedAt) - new Date(a.processedAt));

  const { wrapper, ul } = generateContentWrapper(i18n('content.posts.title'));

  sortedPostsData.forEach(({
    title,
    link,
    id,
  }) => {
    const li = document.createElement('LI');
    li.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-start', 'border-0', 'border-end-0');
    const a = document.createElement('A');
    a.classList.add('fw-bold');
    a.dataset.id = id;
    a.setAttribute('href', link);
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreffer');
    a.dataset.type = 'link';
    a.textContent = title;

    const button = document.createElement('BUTTON');
    button.setAttribute('type', 'button');
    button.dataset.id = id;
    button.dataset.type = 'button';
    button.classList.add('btn', 'btn-outline-primary', 'btn-sm');
    button.textContent = i18n('content.posts.button');

    li.appendChild(a);
    li.appendChild(button);
    ul.appendChild(li);
  });

  posts.appendChild(wrapper);
  posts.appendChild(ul);

  renderViewedPosts(elements, state);
};

export default {
  formMessage: renderFormMessage,
  formStatus: renderFormStatus,
  buttonStatus: renderButtonStatus,
  feeds: renderFeeds,
  posts: renderPosts,
  modal: renderModal,
  modalContent: renderModalContent,
  viewedPosts: renderViewedPosts,
};
