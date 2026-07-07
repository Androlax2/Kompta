export namespace main {
	
	export class Summary {
	    balance: number;
	    totalIncome: number;
	    totalExpenses: number;
	    count: number;
	
	    static createFrom(source: any = {}) {
	        return new Summary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.balance = source["balance"];
	        this.totalIncome = source["totalIncome"];
	        this.totalExpenses = source["totalExpenses"];
	        this.count = source["count"];
	    }
	}
	export class Transaction {
	    id: number;
	    date: string;
	    amount: number;
	    category: string;
	    note: string;
	    createdAt: string;
	
	    static createFrom(source: any = {}) {
	        return new Transaction(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.date = source["date"];
	        this.amount = source["amount"];
	        this.category = source["category"];
	        this.note = source["note"];
	        this.createdAt = source["createdAt"];
	    }
	}

}

