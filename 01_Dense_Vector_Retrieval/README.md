<p align = "center" draggable="false" ><img src="https://github.com/AI-Maker-Space/LLM-Dev-101/assets/37101144/d1343317-fa2f-41e1-8af1-1dbb18399719"
     width="200px"
     height="auto"/>
</p>

<h1 align="center" id="heading">Session 1: Dense Vector Retrieval</h1>

### [Quicklinks]()

| 📰 Module Sheet                                                                 | ⏺️ Recording | 🖼️ Slides | 👨‍💻 Repo       | 📝 Homework | 📁 Feedback |
| :------------------------------------------------------------------------------- | :----------- | :-------- | :------------ | :---------- | :---------- |
| [Dense Vector Retrieval](../00_Docs/Modules/01_Dense_Vector_Retrieval/README.md) |[Recording!](https://us02web.zoom.us/rec/share/sHWvo0Nd1aI0SEhKecOLEX9kFGVJJAdYfsKiuTmm8t85W48Z2lnjpnzTy8jAd8R5.PwuqibGwAZhvDd8c) <br> passcode: `C62n^@Q!`| [Session 1 Slides](https://canva.link/htfqf8i39yejyhn) | You are here! | [Session 1 Assignment](https://forms.gle/Z9qskfVaAvPjn6gz8) | [Feedback 6/2](https://forms.gle/21a2uoL9DVZPwgJP6) |


## 🏗️ How AIM Does Assignments

> 📅 **Assignments will always be released to students as live class begins.** We will never release assignments early.

Each assignment will have a few of the following categories of exercises:

- ❓ **Questions** - these will be questions that you will be expected to gather the answer to. These can appear as general questions, or questions meant to spark a discussion in your breakout rooms.

- 🏗️ **Activities** - these will be work or coding activities meant to reinforce specific concepts or theory components.

- 🚧 **Advanced Builds (optional)** - Take on a challenge. These builds require you to create something with minimal guidance outside of the documentation.

## Main Assignment

In this assignment, you will build a vector RAG application using LangChain v1, OpenAI embeddings, and Qdrant.

The main notebook is:

```text
01_Cat_Health_Vector_RAG_LangChain_Qdrant.ipynb
```

The notebook uses the bundled cat health guideline PDF in `data/cat_health_guidelines.pdf`.

### Setup

From this folder, install the environment with uv:

```bash
uv sync
```

Then open the notebook in Cursor or VS Code and select the Python/Jupyter environment created by uv.

You will also need an OpenAI API key available when running the notebook.

---

## 🏗️ Activity #1: Embedding Similarity

Run the embedding similarity primer in the notebook.

You will compare embeddings for terms like:

- `king`
- `queen`
- `banana`
- `cat`
- `veterinarian`
- `cat health guidelines`

#### ❓Question #1

Why is cosine similarity useful for dense vector retrieval?

##### ✅ Answer:

Cosine similarity measures the angle between two vectors rather than their magnitude (distance). For me I imagine two arrows pointing in 3D space. Cosine similarity asks: are they pointing in the same direction?
In dense vector retrieval, embeddings turn words/sentences into arrows in high-dimensional space. Semantically similar text → arrows pointing roughly the same way. Cosine similarity finds the closest match by finding arrows pointing in the most similar direction.
Doing some more reading online I recently learnt why cosine similarity is used and not just regular distance/similarity. It is simply because a short tweet and a long article about the same topic might be far apart in raw distance (different magnitudes), but their arrows point the same way. Cosine similarity catches that; regular distance misses it.


## 🏗️ Activity #2: Build the Vector RAG Pipeline

Run the notebook sections that:

1. Load the PDF into LangChain `Document` objects
2. Split the document into chunks
3. Embed the chunks
4. Store the chunk embeddings in in-memory Qdrant
5. Retrieve relevant chunks with similarity scores
6. Generate an answer grounded in retrieved context

Answers for the below were copied from the notebook,

#### ❓Question #2

Why is metadata important for a RAG application?

##### ✅ Answer:

To understand the importance of metadata a basic understanding of RAG is needed, I would describe the flow like this;
User Query is embedded -> Similarity search in vector database -> retrieve relevant chunks -> pass to LLM to generate answer grounded in retrieved context. 
Metadata can help this flow at two points:
1. The first is in retrieval where we can do some pre filtering. For example here if rather than having a single pdf we had multiple documents on cats we could ask for something like metadate.title == 'Cats in Australia health guidelines'. This would focus the retrieval on the subset of embeddings from the document 'Cats in Australia health guidelines' - essentially focussing and improving the relevance of retrieved chunks.
1. The second is once we have retrieved the relevant chunks, we can take the metadata and the chunks then add them to the context window so that the LLM and em can see the relevant sources of information as a reference. This allows us to verify and make sure that the chunks used in the RAG loop are relevant and actually exist, making for better traceability.
I see metadata like the spine of a book in a library - it will have information like a title, author, shelf number, genre - it doesn't directly affect the information I am after but it comes with the book and allows me to find it and understand where it came from.


#### ❓Question #3

What tradeoff do we make when choosing chunk size and chunk overlap?

##### ✅ Answer:

Chunk size = how much context each chunk has.
Chunk overlap = how much shared context there is between adjacent chunks. This can be thought of as continuity between chunks.

Chunk size:
1. Too little = a chunk might not have enough information to be useful.
2. Too much = a chunk might have too much information, where each chunk contains multiple ideas or concepts, essentially diluting the relevance of the chunk.

Chunk overlap:
1. Too little = important context might be lost at chunk boundaries, leading to less relevant retrieval results.
2. Too much = it can lead to redundant information across chunks, which may increase storage requirements and retrieval time without adding much value.

The best way to describe the tradeoff is precision vs context - smaller chunks with too little overlap may be more precise but miss important context, while larger chunks with too much overlap may provide richer context but be less precise. Plus the tuning of chunk size and overlap is highly dependent on the specific use case and the nature of the documents being processed. 

#### ❓Question #4

What does a similarity score help you understand, and what does it not prove by itself?

##### ✅ Answer:

The similarity score measures how close two vectors are in embedding space. It is essentially telling you that there is a relationship between the query and the retrieved chunk based on their vector representations. A higher score indicates a stronger relationship, while a lower score suggests a weaker connection. The score is a relevance signal but not a truth signal. It provides ranked information for an LLM to reason over but does not guarantee an actual answer.

You can think of it like a search dog sniffing at an airport - the dog will sniff you if you have drugs in your luggage and sit if you do but it is just going off scent when in reality you just walked into a columbian party the night before but actually have nothing in your luggage. It is giving a signal to a match but is not a guarantee of the truth. 

## 🏗️ Activity #3: Vibe Check Retrieval Quality

Run the notebook's vibe check queries and inspect both:

- The retrieved context
- The generated answer

#### ❓Question #5

For the vibe check queries, did the retrieved context seem relevant before generation? Why or why not?

##### ✅ Answer:

I just slightly updated the vibe check code to return the retrieved context and the generated answer separately, this way we can see the k=4 top retrieved chunks for each question and get a better sense of the relevance of the retrieved context before it is passed to the LLM for synthesis and answer generation.
For the first 3 questions, the retrieved context seems relevant with similarity scores ranging from 0.4 to 0.6 and there abouts.These similarity scores are decent but not super high, which makes sense given the questions are somewhat general and the PDF is quite specific. The retrieved chunks for those questions contain information about cat health and life stages, which is relevant to the questions asked. Also since scores are not super high (especially for the question - What symptoms should make me call a veterinarian?) it shows how absolute score matters less than relative ranking within a query.
However the last question about taxes did not retrieve relevant context, even though the similarity score for the top retrieved chunks was around 0.380 to 0.365 compared to the other questions these scores are poorer. Suggesting that the retriever did not find a strong match in embedding space for the tax question, which makes sense since the PDF is about cat health/ life stages and not taxes. The key takeway for me is that retrieval doesn't know when a question is out of scope — it just returns the closest vectors regardless. The grounding in the system prompt is what prevented a hallucinated answer.

## 🏗️ Activity #4: Tune Retrieval

Improve retrieval quality by changing one or more of:

- Chunk size
- Chunk overlap
- Retrieval `k`
- Query wording

Document what changed and whether retrieval improved.

##### Settings Changed and Results:

Three retrieval settings were tuned against the question *"What symptoms should make me call a veterinarian?"* — chosen because it returned the weakest scores in the vibe check (top score 0.435, vs ~0.58 for more explicit queries).

---

###### Experiment 1 — Query wording

| Rank | Original | Specific symptom query | Δ |
|------|----------|----------------------|---|
| 1 | 0.435 | 0.450 | +0.016 |
| 2 | 0.404 | 0.404 | +0.000 |
| 3 | 0.400 | 0.373 | −0.027 |
| 4 | 0.390 | 0.371 | −0.020 |

**Original:** "What symptoms should make me call a veterinarian?"  
**Updated:** "My cat is vomiting and has diarrhea, should I call a veterinarian?"

The concrete symptom query pulled rank 1 up by +0.016 by landing the embedding closer to the chunk that explicitly mentions vomiting and diarrhea. However ranks 3 and 4 dropped — the specificity narrowed the semantic reach and missed broader symptom chunks the general phrasing caught. The generated answer improved in directness: it moved from a general list to "Yes — vomiting and diarrhea are specifically listed as signs to discuss with a vet."

**Takeaway:** Specific queries improve the top hit but reduce breadth. Best when the user already knows the symptom; less useful for open-ended "what should I watch for" questions.

---

###### Experiment 2 — Retrieval k (k=4 → k=2)

| Rank | k=4 | k=2 |
|------|-----|-----|
| 1 | 0.435 | 0.435 |
| 2 | 0.404 | 0.404 |
| 3 | 0.400 | — |
| 4 | 0.390 | — |

**k=4 answer:** Listed changes in appetite, urination/thirst, vomiting, diarrhea, nocturnal activity, vocalization, and changes in habits — citing Sources 1–3 for disease/pain/cognitive dysfunction context, with Source 4 (kitten behaviour, score 0.390) adding minor noise.

**k=2 answer:** Covered the same core symptoms from Sources 1–2 and still mentioned senior cat specifics (reduced jumping/climbing). The answer was comparably complete despite having half the context, because the top 2 chunks already contained the most relevant content.

The key observation: Source 4 at rank 4 (score 0.390, about kitten behaviour counselling) wasn't actually useful for this question — removing it by dropping to k=2 didn't hurt the answer at all.

**Takeaway:** Reducing k can sharpen answers when the top chunks are strong and lower-ranked chunks add noise. The score gap between rank 2 (0.404) and rank 3 (0.400) is tiny here — both chunks are nearly equally relevant, so k=4 didn't hurt. But at k=4 rank 4 was clearly off-topic.

---

###### Experiment 3 — Chunk size (1000 → 200 characters)

| Rank | chunk_size=1000 | chunk_size=200 | Δ |
|------|----------------|---------------|---|
| 1 | 0.435 | 0.518 | +0.083 |
| 2 | 0.404 | 0.430 | +0.026 |
| 3 | 0.400 | 0.425 | +0.025 |
| 4 | 0.390 | 0.417 | +0.027 |

135 chunks (1000-char) → 662 chunks (200-char). The scores improved significantly — top hit up by +0.083 — but the **answer got worse**. The 200-char chunks retrieved were narrow: urinary tract urgency, DJD in senior cats, litter box elimination, soiling behaviour. These are topically adjacent ("call a vet") but missed the broad symptom list the question was actually asking for. The 1000-char chunk that contained the full paragraph on vomiting, diarrhea, nocturnal activity, and weight monitoring didn't appear at all in the 200-char top-4.

**k=1000 answer:** "Changes in appetite, increased urination, vomiting, diarrhea, nocturnal activity, vocalization, changes in habits or activity" — a direct, comprehensive list.  
**k=200 answer:** "Seek veterinary help promptly for elimination problems such as urinary tract issues or soiling behaviour... owners should learn to read body language" — specific but narrow, misses the main symptom list.

**Takeaway:** Higher retrieval scores do not guarantee a better answer. Smaller chunks scored higher because each vector was tightly focused on one idea ("call the vet for urinary issues"), making it a strong embedding match. But the 1000-char chunk, despite a lower score, held the complete symptom list the LLM needed. This is the precision vs. context tradeoff in action — and it shows why evaluating chunk size on retrieval scores alone is misleading. Answer quality must be assessed too.

---

###### Overall synthesis

Across all three experiments the same tension appears: **precision vs. coverage**. A specific query, low k, and small chunks all push toward precision — better top-hit scores, more focused answers. But Experiment 3 shows precision can backfire: the 200-char chunks scored highest yet produced the least useful answer, because the relevant content was spread across a paragraph that got split apart. The most important lesson is that **retrieval score is a proxy for answer quality, not a guarantee of it**. For this cat health PDF, chunk_size ~1000 with k=4 and a moderately general query gave the best end-to-end results across all three experiments.

This synthesis was written with the help of Claude - but I double checked to make sure it was accurate and made sense.

## Optional Deep Dive: RAG From Scratch

If you want to look underneath the library abstractions, run the optional reference notebook:

```text
02_Cat_Health_Vector_RAG_From_Scratch.ipynb
```

It builds the same retrieval pipeline again with only:

- `pypdf` for extracting text from the PDF
- Python standard-library HTTP requests for calling OpenAI
- Handcrafted document, chunking, embedding, similarity-search, vector-store, and generation primitives

This notebook is a reference walkthrough, not an additional assignment. Its purpose is to make the responsibilities hidden by LangChain, Qdrant, and provider SDKs visible.

---

## Submitting Your Homework

### Main Assignment

Follow these steps to prepare and submit your homework:

1. Pull the latest updates from upstream into the main branch of your AIE9 repo:

```bash
git checkout main
git pull upstream main
git push origin main
```

2. Start Cursor from the `01_Dense_Vector_Retrieval` folder.
3. Complete the notebook.
4. Answer the questions in this `README.md`.
5. Add, commit, and push your modified work to your origin repository.

When submitting your homework, provide the GitHub URL to your AIE9 repo.
