export namespace main {
	
	export class ActivityWithStats {
	    id: number;
	    name: string;
	    createdAt: string;
	    balance: number;
	    totalIncome: number;
	    totalExpenses: number;
	    count: number;
	
	    static createFrom(source: any = {}) {
	        return new ActivityWithStats(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.createdAt = source["createdAt"];
	        this.balance = source["balance"];
	        this.totalIncome = source["totalIncome"];
	        this.totalExpenses = source["totalExpenses"];
	        this.count = source["count"];
	    }
	}
	export class DofusItem {
	    name: string;
	    imgUrl: string;
	    level: number;
	
	    static createFrom(source: any = {}) {
	        return new DofusItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.imgUrl = source["imgUrl"];
	        this.level = source["level"];
	    }
	}
	export class Item {
	    id: number;
	    activityId: number;
	    name: string;
	    startKamas: number;
	    endKamas: number;
	    done: boolean;
	    imgUrl: string;
	    createdAt: string;
	
	    static createFrom(source: any = {}) {
	        return new Item(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.activityId = source["activityId"];
	        this.name = source["name"];
	        this.startKamas = source["startKamas"];
	        this.endKamas = source["endKamas"];
	        this.done = source["done"];
	        this.imgUrl = source["imgUrl"];
	        this.createdAt = source["createdAt"];
	    }
	}
	export class ItemWithStats {
	    id: number;
	    activityId: number;
	    name: string;
	    startKamas: number;
	    endKamas: number;
	    done: boolean;
	    imgUrl: string;
	    createdAt: string;
	    spent: number;
	    sales: number;
	    balance: number;
	    count: number;
	
	    static createFrom(source: any = {}) {
	        return new ItemWithStats(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.activityId = source["activityId"];
	        this.name = source["name"];
	        this.startKamas = source["startKamas"];
	        this.endKamas = source["endKamas"];
	        this.done = source["done"];
	        this.imgUrl = source["imgUrl"];
	        this.createdAt = source["createdAt"];
	        this.spent = source["spent"];
	        this.sales = source["sales"];
	        this.balance = source["balance"];
	        this.count = source["count"];
	    }
	}
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
	    activityId: number;
	    itemId: number;
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
	        this.activityId = source["activityId"];
	        this.itemId = source["itemId"];
	        this.createdAt = source["createdAt"];
	    }
	}

}

