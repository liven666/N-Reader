import { getThreadsByBoard, getPostsByThread } from "./services/ngaApi";

async function analyzeEmoticons() {
  try {
    // Fetch threads from a popular board (e.g., 414)
    const threads = await getThreadsByBoard("414", 1);
    console.log(`Fetched ${threads.length} threads`);
    
    const emoticons = new Set<string>();
    
    for (const thread of threads.slice(0, 5)) { // Fetch posts from first 5 threads
      const { posts } = await getPostsByThread(thread.id);
      for (const post of posts) {
        const matches = post.content.match(/\[s:ac:([^\]]+)\]/g);
        if (matches) {
          matches.forEach(m => emoticons.add(m));
        }
        const matches2 = post.content.match(/\[s:a2:([^\]]+)\]/g);
        if (matches2) {
          matches2.forEach(m => emoticons.add(m));
        }
      }
    }
    console.log("Found emoticons:", Array.from(emoticons));
  } catch (e) {
    console.error(e);
  }
}

// analyzeEmoticons();
