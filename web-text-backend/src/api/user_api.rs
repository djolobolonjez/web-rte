use crate::{models::user::User, models::user::RichTextDoc, repository::mongodb_repo::MongoRepo};
use actix_web::{
    post,
    get,
    web::{Data, Json, Path},
    HttpResponse,
};

#[post("/user")]
pub async fn create_user(db: Data<MongoRepo>, new_user: Json<User>) -> HttpResponse {
    let data = User {
        id: None,
        username: new_user.username.to_owned(),
        email: new_user.email.to_owned(),
        password: new_user.password.to_owned(),
        documents: new_user.documents.as_slice().to_vec(),
    };

    let user_result = db.create_user(data).await;
    match user_result {
        Ok(user) => HttpResponse::Ok().json(user),
        Err(err) => HttpResponse::InternalServerError().body(err.to_string()),
    }
}

#[get("/user/{username}")]
pub async fn find_user(db: Data<MongoRepo>, path: Path<String>) -> HttpResponse {
    let username = path.into_inner();
    if username.is_empty() {
        return HttpResponse::BadRequest().body("Invalid username!");
    }

    let user_result = db.find_user(&username).await;
    match user_result {
        Ok(user) => HttpResponse::Ok().json(user),
        Err(err) => HttpResponse::InternalServerError().body(err.to_string()),
    }
}

#[get("/user/{username}/{password}")]
pub async fn get_user(db: Data<MongoRepo>, path: Path<(String, String)>) -> HttpResponse {
    let (username, password) = path.into_inner();
    if username.is_empty() || password.is_empty() {
        return HttpResponse::BadRequest().body("Invalid username or password!");
    }

    let user_result = db.get_user(&username, &password).await;
    match user_result {
        Ok(user) => HttpResponse::Ok().json(user),
        Err(err) => HttpResponse::InternalServerError().body(err.to_string()),
    }
}

#[post("/document")]
pub async fn insert_document(db: Data<MongoRepo>, new_doc: Json<RichTextDoc>) -> HttpResponse {
    let data = RichTextDoc {
        content: new_doc.content.to_owned(),
        comments: new_doc.comments.as_slice().to_owned(),
        doctype: new_doc.doctype,
        name: new_doc.name.to_owned(),
        owner: new_doc.owner.to_owned()
    };

    let update_result = db.insert_document(&new_doc.owner, data, None).await;
    match update_result {
        Ok(res) => HttpResponse::Ok().json(res),
        Err(err) => HttpResponse::InternalServerError().body(err.to_string()),
    }
}

#[post("/document/share/{email}")]
pub async fn share_document(db: Data<MongoRepo>, shared_doc: Json<RichTextDoc>, path: Path<String>) -> HttpResponse {
    let doc = RichTextDoc {
        content: None,
        comments: Vec::with_capacity(0),
        doctype: 1,
        name: shared_doc.name.to_owned(),
        owner: shared_doc.owner.to_owned()
    };
    
    let email = path.into_inner();

    println!("{}", email);

    let update_result = db.insert_document(&email, doc, Some(true)).await;
    match update_result {
        Ok(res) => HttpResponse::Ok().json(res),
        Err(err) => HttpResponse::InternalServerError().body(err.to_string()),
    }
}

#[get("/document/{username}/{docname}")]
pub async fn get_document(db: Data<MongoRepo>, path: Path<(String, String)>) -> HttpResponse {
    let (username, docname) = path.into_inner();
    
    let find_result = db.get_document(&username, &docname).await;
    match find_result {
        Ok(res) => HttpResponse::Ok().json(res),
        Err(err) => HttpResponse::InternalServerError().body(err.to_string()),
    }
}