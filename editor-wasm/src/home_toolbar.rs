use std::collections::VecDeque;

use wasm_bindgen::prelude::*;

const MAX_CAPACITY: usize = 20;

#[wasm_bindgen]
pub struct SearchManager {
    content: String,
}

#[wasm_bindgen]
impl SearchManager {

    pub fn new (content: String) -> Self {
        Self {
            content,
        }
    }

    pub fn get_content(&self) -> String {
        self.content.clone()
    }

    pub fn set_content(&mut self, new_content: String) {
        self.content = new_content;
    }

    pub fn replace_all(&mut self, from: &str, to: &str) -> String {
        self.content = self.content.replace(from, to);
        self.content.clone()
    }

    pub fn find_all(&self, text: &str) -> Vec<usize> {
        return self.content.match_indices(text).map(|pair| pair.0).collect();   
    }
}

#[wasm_bindgen]
pub struct VersionManager {
    latest_versions: VecDeque<String>,
    current_index: usize,
}

impl VersionManager {
    pub fn new(initial_content: String) -> Self {
        let mut instance = Self {
            latest_versions: VecDeque::with_capacity(MAX_CAPACITY),
            current_index: 0,
        };
        instance.latest_versions.push_back(initial_content);

        instance
    }

    pub fn undo(&mut self) -> Option<String> {
        if self.current_index == 0 {
            return None;
        }

        self.current_index -= 1;
        let prev_content = self.latest_versions[self.current_index].clone();
        Some(prev_content)
    }

    pub fn redo(&mut self) -> Option<String> {
        if self.current_index == self.latest_versions.len() {
            return None;
        }

        self.current_index += 1;
        let later_content = self.latest_versions[self.current_index].clone();
        Some(later_content)
    }

    pub fn add_content(&mut self, content: String) {
        if self.latest_versions.len() == MAX_CAPACITY {
            self.latest_versions.pop_front();
        }
        self.latest_versions.push_back(content);
    }


}