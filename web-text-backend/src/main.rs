mod api;
mod repository;
mod models;

use actix_web::{get, web::Data, App, HttpResponse, HttpServer, Responder};
use api::user_api::{create_user, get_document, get_user, insert_document, share_document};
use repository::mongodb_repo::MongoRepo;

use actix_cors::Cors;

#[get("/")]
async fn hello() -> impl Responder {
    HttpResponse::Ok().json("Hello from rust!")
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let db = MongoRepo::init().await;
    let db_data = Data::new(db);

    HttpServer::new(move || {
        App::new()
            .app_data(db_data.clone())
            .wrap(Cors::permissive())
            .service(create_user)
            .service(get_user)
            .service(insert_document)
            .service(get_document)
            .service(share_document)
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}