import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Editor } from '../core/impl/editor';
import { CommentHandler } from '../impl/CommentHandler';

@Injectable({
  providedIn: 'root'
})
export class CommonService {

  constructor(private http: HttpClient) { }

  uri: string = "http://127.0.0.1:8080";

  public login(username: string, password: string) {
    return this.http.get(`${this.uri}/user/${username}/${password}`);
  }

  public findUser() {
    const username = sessionStorage.getItem('username');
    return this.http.get(`${this.uri}/user/${username}`);
  }

  public getDocument(docname: string) {
    const username = sessionStorage.getItem('username');

    return this.http.get(`${this.uri}/document/${username}/${docname}`);
  }

  public shareDocument(email: string) {
    let data = {
      "content": null,
      "comments": [],
      "doctype": 1,
      "name": sessionStorage.getItem('docname'),
      "owner": sessionStorage.getItem('username')
    };

    return this.http.post(`${this.uri}/document/share/${email}`, data);
  }

  public saveDocument(username: string, docname: string) {
    let data = {
      "content": Editor.getInstance().getRawContent(),
      "comments": CommentHandler.getInstance().getRawComments(),
      "doctype": 0,
      "name": sessionStorage.getItem('docname'),
      "owner": username
    };

    console.log(data);

    return this.http.post(`${this.uri}/document`, data);
  }
}
