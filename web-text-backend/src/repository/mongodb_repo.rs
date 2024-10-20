use std::env;
extern crate dotenv;
use dotenv::dotenv;


use mongodb::{
    bson::{doc, extjson::de::Error},
    results::{InsertOneResult, UpdateResult},
    options::FindOneOptions,
    Client,
    Collection
};

use crate::models::user::{RichTextDoc, User};

pub struct MongoRepo {
    coll: Collection<User>,
}

impl MongoRepo {
    pub async fn init() -> Self {
        dotenv().ok();
        let uri = match env::var("MONGOURI") {
            Ok(v) => v.to_string(),
            Err(_) => format!("Error loading env variable"),
        };

        let client = Client::with_uri_str(uri).await.unwrap();
        let db = client.database("web-rte");
        let coll: Collection<User> = db.collection("docs");
        MongoRepo { coll }
    }

    pub async fn create_user(&self, new_user: User) -> Result<InsertOneResult, Error> {
        let new_doc = User {
            id: None,
            username: new_user.username,
            email: new_user.email,
            password: new_user.password,
            documents: new_user.documents,
        };

        let user = self
            .coll
            .insert_one(new_doc, None)
            .await
            .ok()
            .expect("Error creating new user");

        Ok(user)
    }

    pub async fn get_user(&self, username: &String, password: &String) -> Result<User, Error> {
        let filter = doc! {"username": username, "password": password};
        let user_result = self
            .coll
            .find_one(filter, None)
            .await
            .ok()
            .expect("Error retrieving user");

        Ok(user_result.unwrap())
    }

    pub async fn find_user(&self, username: &String) -> Result<User, Error> {
        let filter = doc! {"username": username};
        let user_result = self
            .coll
            .find_one(filter, None)
            .await
            .ok()
            .expect("Error retrieving user");

        Ok(user_result.unwrap())
    }

    pub async fn insert_document(&self, username: &String, doc: RichTextDoc, is_shared: Option<bool>) -> Result<UpdateResult, Error> {
        let new_doc = doc! {
            "content": doc.content,
            "comments": doc.comments,
            "doctype": doc.doctype,
            "name": doc.name.to_owned(),
            "owner": doc.owner.to_owned()
        };

        let pull_update = doc! {
            "$pull": 
                doc! {
                    "documents": {
                        "name": doc.name
                    }
                }
        };

        let update = doc ! {
            "$push": 
                doc! {
                    "documents": new_doc
                }
        };

        let mut filter = doc! {"username": username};
        match is_shared {
            Some(_) => { filter = doc! {"email": username} }
            None => {}
        }

        self.coll
            .update_one(filter.clone(), pull_update, None)
            .await
            .ok()
            .expect("Unexpected db error");

        let update_result = self
            .coll
            .update_one(filter, update, None)
            .await
            .ok()
            .expect("Error inserting document!");

        Ok(update_result)
    }

    pub async fn get_document(&self, username: &String, name: &String) -> Result<RichTextDoc, Error> {
        let projection = doc! {
            "username": 1,
            "email": 1,
            "password": 1,
            "documents": { "$elemMatch": { "name": name } }
        };
        let options = FindOneOptions::builder().projection(projection).build();

        let filter = doc! {
            "username": username
        };
        
        let user_result = self
            .coll
            .find_one(filter, options.clone())
            .await
            .ok()
            .expect("No matching document found");

        let user = user_result.unwrap();

        if user.documents[0].doctype == 1 {
            let owner_user_result = self
                .coll
                .find_one(doc!{"username": user.documents[0].owner.to_owned()}, options)
                .await
                .ok()
                .expect("No matching document found");

            let mut owner_user = owner_user_result.unwrap();
            owner_user.documents[0].doctype = 1;

            return Ok(owner_user.documents[0].clone());
        }
        
        Ok(user.documents[0].clone())
    }

}