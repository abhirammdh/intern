import streamlit as st
import os
from pathlib import Path
from backend.indexing import load_or_create_vectorstore, load_or_create_pmjay_vectorstore
from backend.retrieval import search_documents

# =====================================
# Page config
# =====================================
st.set_page_config(
    page_title="RAG Search - Neon Style",
    page_icon="🔍",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Simple dark theme + hide default elements
st.markdown("""
    <style>
    header, #MainMenu, footer { visibility: hidden; }
    .stApp {
        background: #05050a;
        color: #e0e0ff;
    }
    .stTextInput > div > div > input {
        background: #1a1a2e;
        color: white;
        border-radius: 8px;
    }
    </style>
""", unsafe_allow_html=True)

st.title("🔍 RAG Document Search")
st.markdown("Ask questions about **HTML/CSS** or **PM-JAY documents**")

# =====================================
# Sidebar controls
# =====================================
with st.sidebar:
    st.header("Settings")
    search_mode = st.radio(
        "Search Type",
        ["Text documents (HTML/CSS)", "Multimodal PM-JAY"],
        index=0
    )
    
    rebuild_index = st.checkbox("Rebuild vector store (slow)", value=False)
    
    top_k = st.slider("Number of results", 1, 10, 5)

# =====================================
# Load vector stores
# =====================================
@st.cache_resource(show_spinner="Loading vector stores...")
def get_vectorstores():
    text_vs = load_or_create_vectorstore(force_rebuild=rebuild_index)
    
    if search_mode == "Multimodal PM-JAY":
        pmjay_vs = load_or_create_pmjay_vectorstore(force_rebuild=rebuild_index)
        return text_vs, pmjay_vs
    return text_vs, None

text_vectorstore, pmjay_vectorstore = get_vectorstores()

# =====================================
# Search interface
# =====================================
query = st.text_input("Your question:", placeholder="e.g. What is HTML?  or  How to apply Ayushman card?")

if query and query.strip():
    with st.spinner("Searching..."):
        if search_mode == "Text documents (HTML/CSS)":
            docs = search_documents(text_vectorstore, query, k=top_k)
            collection_name = "HTML & CSS documents"
        else:
            if pmjay_vectorstore is None:
                st.error("PM-JAY vector store not loaded yet.")
                st.stop()
            docs = search_documents(pmjay_vectorstore, query, k=top_k)
            collection_name = "PM-JAY multimodal documents"

        st.subheader(f"Results from: {collection_name}")

        if not docs:
            st.warning("No relevant documents found.")
        else:
            for i, doc in enumerate(docs, 1):
                with st.expander(f"Result {i} – Page {doc.metadata.get('page', 'N/A')}"):
                    st.markdown("**Content:**")
                    st.write(doc.page_content.strip())

                    # Optional: show metadata
                    with st.expander("Metadata", expanded=False):
                        st.json(doc.metadata)

                    # If multimodal and image exists
                    if "image_id" in doc.metadata:
                        image_path = f"image_store_pmjay/{doc.metadata['image_id']}"
                        if Path(image_path).exists():
                            st.image(image_path, caption="Extracted image", use_column_width=True)
                        else:
                            st.caption("Image file not found")

else:
    st.info("Enter your question above to start searching.")