export const loadScript = (src, id) => {
  if (!document.getElementById(id)) {
    const script = document.createElement("script");
    script.src = src;
    script.id = id;
    document.body.appendChild(script);
  }
};

