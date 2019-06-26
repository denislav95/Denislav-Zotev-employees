import React, { Component } from "react";
import Dropzone from "../dropzone/Dropzone";
import "./Upload.css";
import Progress from "../progress/Progress";

class Upload extends Component {
  constructor(props) {
    super(props);
    this.state = {
      files: [],
      uploading: false,
      uploadProgress: {},
      successfullUploaded: false,
      error: '',
      employeesData: null
    };

    this.onFilesAdded = this.onFilesAdded.bind(this);
    this.uploadFiles = this.uploadFiles.bind(this);
    this.sendRequest = this.sendRequest.bind(this);
    this.renderActions = this.renderActions.bind(this);
  }

  onFilesAdded(files) {
    this.setState(prevState => ({
      files: prevState.files.concat(files)
    }));
  }

  async uploadFiles() {
    this.setState({ uploadProgress: {}, uploading: true });
    const promises = [];
    this.state.files.forEach(file => {
      promises.push(this.sendRequest(file));
    });
    try {
      await Promise.all(promises);

      this.setState({ successfullUploaded: true, uploading: false });
    } catch (e) {
      // Not Production ready! Do some error handling here instead...
      this.setState({ successfullUploaded: true, uploading: false });
    }
  }

  sendRequest(file) {

      if (file.type === 'text/plain') {
          return new Promise((resolve, reject) => {
              const req = new XMLHttpRequest();

              req.upload.addEventListener("progress", event => {
                  if (event.lengthComputable) {
                      const copy = { ...this.state.uploadProgress };
                      copy[file.name] = {
                          state: "pending",
                          percentage: (event.loaded / event.total) * 100
                      };
                      this.setState({ uploadProgress: copy });
                  }
              });

              req.upload.addEventListener("load", event => {
                  const copy = { ...this.state.uploadProgress };
                  copy[file.name] = { state: "done", percentage: 100 };
                  this.setState({ uploadProgress: copy });
                  resolve(req.response);
              });

              req.upload.addEventListener("error", event => {
                  const copy = { ...this.state.uploadProgress };
                  copy[file.name] = { state: "error", percentage: 0 };
                  this.setState({ uploadProgress: copy });
                  reject(req.response);
              });

              const formData = new FormData();
              formData.append("file", file, file.name);

              const _this = this;
              req.onreadystatechange = function() {
                  if (this.readyState == 4 && this.status == 200) {
                    if (req.responseText !== 'null') {
                        _this.setState({ employeesData: JSON.parse(req.responseText) });
                    } else {
                        _this.setState({ error: 'Empty file!' });
                    }
                  }
              };

              req.open("POST", "http://localhost:3001/upload");
              req.send(formData);
          });
      } else {
        this.setState({ error: 'Only txt files are supported!' })
      }
  }

  renderProgress(file) {
    const uploadProgress = this.state.uploadProgress[file.name];
    if (this.state.uploading || this.state.successfullUploaded) {
      return (
        <div className="ProgressWrapper">
          <Progress progress={uploadProgress ? uploadProgress.percentage : 0} />
          <img
            className="CheckIcon"
            alt="done"
            src="baseline-check_circle_outline-24px.svg"
            style={{
              opacity:
                uploadProgress && uploadProgress.state === "done" ? 0.5 : 0
            }}
          />
        </div>
      );
    }
  }

  renderActions() {
    if (this.state.successfullUploaded) {
      return (
        <button
          onClick={() =>
              window.location.reload()
         }
        >
          New file
        </button>
      );
    } else {
      return (
        <button
          disabled={this.state.files.length < 0 || this.state.uploading}
          onClick={this.uploadFiles}
        >
          Upload
        </button>
      );
    }
  }

  render() {
    const {employeesData} = this.state;
    return (
      <div className="Upload">
        <span className="Title">Upload Files</span>
        <div className="Content">
          <div>
            <Dropzone
              onFilesAdded={this.onFilesAdded}
              disabled={this.state.uploading || this.state.successfullUploaded}
            />
          </div>
          <div className="Files">
            {this.state.files.map(file => {
              return (
                <div key={file.name} className="Row">
                  <span className="Filename">{file.name}</span>
                  {this.renderProgress(file)}
                </div>
              );
            })}
            { this.state.error ? <h6 className="error">{ this.state.error }</h6> : '' }
          </div>
        </div>
        <div className="Actions">{this.renderActions()}</div>
          {
            employeesData ?
                <div className="responsive-table" id="employees">
                  <table>
                    <thead>
                    <tr>
                      <th>Employee ID #1</th>
                      <th>Employee ID #2</th>
                      <th>Project ID</th>
                      <th>Days Worked</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr>
                      {employeesData.employees.map((x, i) => <td key={i}>{x}</td>)}
                      <td>{employeesData.project}</td>
                      <td>{employeesData.days}</td>
                    </tr>
                    </tbody>
                  </table>
                </div>
                : null
          }
      </div>
    );
  }
}

export default Upload;
