use std::collections::VecDeque;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct SearchManager {
    content: String,
    found_indices: VecDeque<usize>,
    word_to_find: String
}

#[wasm_bindgen]
impl SearchManager {

    pub fn new (content: String) -> Self {
        Self {
            content,
            found_indices: VecDeque::new(),
            word_to_find: String::new(),
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

    pub fn find_next(&mut self, search_term: &str) -> Option<usize> {

        if self.found_indices.is_empty() || search_term != self.word_to_find {
            self.found_indices = self.content.match_indices(search_term).map(|pair| pair.0).collect();
        }

        self.word_to_find = search_term.to_owned();

        match self.found_indices.pop_front() {
            None => { return None; }
            Some(x) => { 
                self.found_indices.push_back(x);
                Some(x)
            }
        }
    }

    pub fn remove_last(&mut self) {
        self.found_indices.pop_back();
    }

    pub fn clear(&mut self) {
        self.found_indices.clear();
    }

    pub fn shift_after_index(&mut self, index: usize, shift_amount: usize, neg: bool) {
        self.found_indices
            .iter_mut()
            .filter(|&&mut word_index| word_index > index)
            .for_each(|word_index| match neg {
                true => *word_index -= shift_amount,
                false => *word_index += shift_amount
            });
    }

    pub fn insert_in_order(&mut self, word_index: usize) {
        let mut insert_pos = self.found_indices.len(); 
    
        for (i, &current_element) in self.found_indices.iter().enumerate() {
            if current_element > word_index {
                insert_pos = i;
                break; 
            }
        }
        self.found_indices.insert(insert_pos, word_index);
    }

    pub fn remove_element(&mut self, word_index: usize) {
        self.found_indices.retain(|&x| x != word_index);
    }
}
