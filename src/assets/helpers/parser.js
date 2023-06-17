const parser = new DOMParser();
const getterFromDocByTag = (domTree) => (tag) => domTree.querySelector(tag).textContent;

const getPostsData = (nodeList) => {
  const nodes = Array.from(nodeList);
  const data = nodes.map((node) => {
    const getterOfDataFromNode = getterFromDocByTag(node);
    const title = getterOfDataFromNode('title');
    const description = getterOfDataFromNode('description');
    const link = getterOfDataFromNode('link');
    return {
      title,
      description,
      link,
    };
  });
  return data;
};

export default (string) => {
  const documentFromData = parser.parseFromString(string, 'application/xml');
  const parserErrorElement = documentFromData.querySelector('parsererror');
  if (parserErrorElement) {
    throw new SyntaxError('noRss');
  }
  const get = getterFromDocByTag(documentFromData);
  const title = get('title');
  const description = get('description');
  const posts = documentFromData.querySelectorAll('item');
  const postsData = getPostsData(posts);
  return {
    channel: {
      title,
      description,
      items: postsData,
    },
  };
};
