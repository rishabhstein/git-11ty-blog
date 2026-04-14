const MEMOS_HOST = "https://memos.sigmarootpi.com";
const API_URL = `${MEMOS_HOST}/api/v1/memos`;
const API_TOKEN = "eyJhbGciOiJIUzI1NiIsImtpZCI6InYxIiwidHlwIjoiSldUIn0.eyJuYW1lIjoiYWRtaW4iLCJpc3MiOiJtZW1vcyIsInN1YiI6IjEiLCJhdWQiOlsidXNlci5hY2Nlc3MtdG9rZW4iXSwiaWF0IjoxNzU0OTgyOTkxfQ.2G95zYP246f34mx1wzHxJCTkZ0QIp3E9lV0GpDcUk_M"; // optional

fetch(API_URL, {
  headers: API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}
})
// .then(res => res.json())

.then(res => res.text())
.then(text => {
  console.log("Raw API response text:", text);
  return JSON.parse(text); // or try/catch if needed
})

.then(json => {
    console.log("API response:", json);
  if (!json.memos || !Array.isArray(json.memos)) {
    console.error("Expected json.memos to be an array, got:", json.memos);
    return;
  }

  const list = document.getElementById("memoList");

  json.memos.forEach(memo => {
    const createdDate = new Date(memo.createTime);
    let mediaHTML = "";

    if (memo.resources && memo.resources.length) {
      mediaHTML = `<div class="memo-media">` +
        memo.resources.map(media => {
          if (media.type && media.type.startsWith("image/")) {
            // Construct image URL
            const imgURL = `${MEMOS_HOST}/file/${media.name}/${media.filename}`;
            return `<img src="${imgURL}" crossorigin="anonymous" alt="${media.filename}" loading="lazy" style="max-width:100%;">`;
          }
          return `<a href="${MEMOS_HOST}/file/${media.name}/${media.filename}">${media.filename}</a>`;
        }).join("") +
        `</div>`;
    }

    json.memos.forEach(memo => {
    console.log('Memo createTime:', memo.createTime);
    console.log('Memo content:', memo.content);

    const createdDate = new Date(memo.createTime);
    if (isNaN(createdDate)) {
      console.warn('Invalid date found:', memo.createTime);
      return; // skip this memo or handle fallback
    }


    const li = document.createElement("li");
    li.innerHTML = `
      <time datetime="${createdDate.toISOString()}">
        ${createdDate.toLocaleDateString()}
      </time>
      <div class="memo-content">${memo.content || ""}</div>
      ${mediaHTML}
    `;
    list.appendChild(li);
  });

})
.catch(err => console.error("Failed to load memos:", err));

});