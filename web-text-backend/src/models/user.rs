use mongodb::bson::oid::ObjectId;
use mongodb::bson::Document;
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RichTextDoc {
    pub content: Option<String>,
    pub comments: Vec<Document>,
    pub doctype: i32,
    pub name: String,
    pub owner: String
}

#[derive(Debug, Serialize, Deserialize)]
pub struct User {
    pub id: Option<ObjectId>,
    pub username: String,
    pub email: String,
    pub password: String,
    pub documents: Vec<RichTextDoc>
}