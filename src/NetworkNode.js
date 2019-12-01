
const BFS_ASSIGN_ID = 1;
const BFS_ASSIGN_ACK = 2;
const BFS_ASSIGN_NACK = 3;

const UNINITIALIZED = 'uninitialized';
const ASSIGNED = 'assigned';
const ASSIGNING = 'assigning';
const WAITING = 'waiting';
const INITIALIZED = 'initialized';

export default class NetworkNode {
    constructor(physical) {
        // essential variables used to route packets in the network layer
        this.physical = physical;
        this.parent = undefined;
        this.id = undefined;
        this.routeTable = {};

        // variables only necessary for the initialization process
        this.state = UNINITIALIZED;
        this.assigning = 0;
        this.nextId = 1;
        this.tableChange = false;
    }

    /*
     *******************************************************************************************************************
     * Core network node functions
     *******************************************************************************************************************
     */
    is(state) {
        return this.state === state;
    }

    initialize() {
        this.processState();
        this.processPackets();
        return false;   // TODO: find a way to process packets even when fully initialized
        //return this.is(INITIALIZED);
    }

    sendAck() {
        this.physical.transmit(this.parent, {
            type: BFS_ASSIGN_ACK,
            nextId: this.nextId,
        });
    }

    /*
     *******************************************************************************************************************
     * Functions that are executed based on what state the network node is currently in
     *******************************************************************************************************************
     */
    processState() {
        switch (this.state) {
            case UNINITIALIZED:
            case ASSIGNED:
                this.stepRootAssignment();
                break;

            case ASSIGNING:
                this.performAssignment();
                break;
        }
    }

    stepRootAssignment() {
        if (this.physical.isRoot()) {
            console.log("Root assigning next layer");
            this.handleAssign({id: this.nextId, neighbor: 'self'});
        }
    }

    performAssignment() {
        this.assigning = this.nextNeighborIndex();
        if (this.assigning === undefined) {
            // if there is nothing left to assign, then stop assignment
            this.sendAck();

            if (this.tableChange) {
                console.log(`${this.id} stopping assignment`);
                this.state = ASSIGNED;
            } else {
                console.log(`${this.id} now initialized`);
                this.state = INITIALIZED;
            }

            return;
        }

        console.log(`${this.id} assigning to neighbor ${this.assigning}`);
        this.state = WAITING;
        this.physical.transmit(this.assigning, {
            type: BFS_ASSIGN_ID,
            id: this.nextId,
        });
    }

    nextNeighborIndex() {
        for (let i=this.assigning + 1; i<6; i++) {
            if (this.physical.hasNeighbor(i)) {
                return i;
            }
        }

        return undefined;
    }

    /*
     *******************************************************************************************************************
     * Functions that are executed based on packets received
     *******************************************************************************************************************
     */
    processPackets() {
        while (this.physical.hasPacket()) {
            const packet = this.physical.getPacket();
            switch (packet.type) {
                case BFS_ASSIGN_ID:
                    this.handleAssign(packet);
                    break;

                case BFS_ASSIGN_ACK:
                    this.handleAck(packet);
                    break;

                case BFS_ASSIGN_NACK:
                    this.handleNack(packet);
                    break;

                default:
                    console.log("Bad message in initialization process: ", packet);
            }
        }
    }

    handleAssign(packet) {
        if (this.is(UNINITIALIZED)) {
            // this is our assignment; whoever sent us the packet is now our 'parent'
            this.id = packet.id;
            this.nextId = this.id + 1;
            this.parent = packet.neighbor;
            this.state = ASSIGNED;
            this.sendAck();
            console.log(`(${this.physical.x}, ${this.physical.y}) Assigned ID ${this.id} from neighbor ${this.parent}`);

        } else if (this.is(ASSIGNED) && packet.neighbor === this.parent) {
            // follow-up assignment from parent means we assign to our children
            this.tableChange = false;
            this.assigning = -1;
            this.nextId = packet.id;
            this.state = ASSIGNING;

        } else {
            this.physical.transmit(packet.neighbor, {
                type: BFS_ASSIGN_NACK,
            });
        }
    }

    handleAck(packet) {
        if (!this.is(WAITING)) {
            console.log(`Invalid ACK packet received: ${packet}`);
            return;
        }

        this.nextId = packet.nextId;
        this.state = ASSIGNING;
        // TODO: build default route table, and actually check for changes
        this.tableChange = true;
    }

    handleNack(packet) {
        if (!this.is(WAITING)) {
            console.log(`Invalid NACK packet received: ${packet}`);
            return;
        }

        this.state = ASSIGNING;
        // TODO: possibly transmit route information on NACKs? Could be used to find shortest routes without running BFS from every node
    }
}