import { DBObject } from "types/DBObject";
import { HTMLAttributeName } from "types/objects/HTMLAttributeName";
import { HTMLAttributeValue } from "types/objects/HTMLAttributeValue";

export class HTMLAttribute extends DBObject<HTMLAttribute> {
    readonly name: HTMLAttributeName;
    readonly value: HTMLAttributeValue;

    hashPrefix(): string {
        return "html-attribute";
    }
    hashSuffix(): string {
        return `${this.name.value}\0${this.value.value}`
    }
    insertCols(): string[] {
        return ["id", "name", "value"];
    }
    getInsertParams(): any[] {
        return [this.getID(), this.name.getID(), this.value.getID()];
    }
    table(): string {
        return "HTMLAttribute";
    }
}