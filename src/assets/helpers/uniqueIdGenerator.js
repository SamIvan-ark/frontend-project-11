export default () => {
  let id = -1;
  return () => {
    id += 1;
    return id;
  };
};
