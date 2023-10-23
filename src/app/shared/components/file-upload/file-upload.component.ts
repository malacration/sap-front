
import { Component, Output, EventEmitter } from '@angular/core';


@Component({
    selector: 'file-upload',
    templateUrl: "file-upload.component.html",
    styleUrls: ["file-upload.component.scss"]
})
export class FileUploadComponent {

    
    files : Array<any> = [];
    currentFile : any

    nameSelectedFile: string = "Escolher arquivo";
    newName : string

    @Output()
    filesOutput = new EventEmitter<Array<any>>();

    getNewFile(){
        if(this.newName){
            var file = this.currentFile;
            var blob = file.slice(0, file.size,this.currentFile.type); 
            this.currentFile = new File([blob], this.newName,{type: this.currentFile.type});
        }
        this.newName = undefined;
        this.files.push(this.currentFile);
        this.nameSelectedFile = "Escolher arquivo"
        this.currentFile = null;
        this.filesOutput.emit(this.files)
    }

    selectFile(event) {
        this.nameSelectedFile = event.target.files[0].name
        this.currentFile = event.target.files[0];
    }

    removeFile(index){
        this.files.splice(index,1);
    }
}
