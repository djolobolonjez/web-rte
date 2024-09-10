use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct SearchManager {
    content: String,
}

#[wasm_bindgen]
impl SearchManager {

    pub fn new (content: String) -> SearchManager {
        SearchManager {
            content,
        }
    }

    pub fn get_content(&self) -> String {
        self.content.clone()
    }

    pub fn set_content(&mut self, new_content: String) {
        self.content = new_content;
    }

    pub fn find_and_replace(&mut self, from: &str, to: &str) -> String {
        self.content = self.content.replace(from, to);
        self.content.clone()
    }
}