

export class CowntDown {

    display: any;

    private statSec : number

    getSec() : number{
      return this.statSec
    }
  
    timer(minute) {
      let seconds: number = minute * 60;
      let textSec: any = "0";
      this.statSec = 60;
  
      const prefix = minute < 10 ? "0" : "";
  
      const timer = setInterval(() => {
        seconds--;
        if (this.statSec != 0) this.statSec--;
        else this.statSec = 59;
  
        if (this.statSec < 10) {
          textSec = "0" + this.statSec;
        } else textSec = this.statSec;
  
        this.display = `${prefix}${Math.floor(seconds / 60)}:${textSec}`;
        
  
        if (seconds == 0) {
          clearInterval(timer);
        }
      }, 1000);
    }
  
  }