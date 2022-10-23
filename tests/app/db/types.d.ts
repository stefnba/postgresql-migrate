export type Auth_Logins = {
    id: number;
    userId: number;
    logginAt?: Date;
    success?: boolean;
};

export type Transactions = {
    id: number;
    date: Date;
    amount: number;
    userId: number;
};

export type User_Users = {
    id: number;
    name: string;
    email: string;
};
