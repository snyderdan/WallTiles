
const BFS_ASSIGN_ID = 1;
const BFS_ASSIGN_ACK = 2;
const BFS_ASSIGN_NACK = 3;
const NETWORK_ROUTE = 4;

const UNINITIALIZED = 'uninitialized';
const ASSIGNED = 'assigned';
const ASSIGNING = 'assigning';
const WAITING = 'waiting';
const INITIALIZED = 'initialized';

export default class NetworkNode {
    constructor(physical) {
        // essential variables used to route packets in the network layer
        this.physical = physical;
        this.parent = null;
        this.id = null;
        this.routeTable = [];
        this.neighborTable = [];
        this.received = [];

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

    initialize() {
        this.processState();
        this.processPackets();
        return this.is(INITIALIZED);
    }

    forwardPacket(packet) {
        // if we have an entry for where the packet should go, send it there. Otherwise, forward to parent
        const forwardTo = this.routeTable[packet.target] || this.parent;
        this.physical.transmit(forwardTo, packet);
    }

    send(target, message) {
        this.forwardPacket({
            ...message,
            type: NETWORK_ROUTE,
            target: target,
            source: this.id,
        });
    }

    sendToNeighbor(neighbor, message) {
        this.send(this.neighborTable[neighbor], message);
    }

    hasPacket() {
        return this.received.length > 0;
    }

    getPacket() {
        return this.received.shift();
    }

    /*
     *******************************************************************************************************************
     * Utility methods for initialization process
     *******************************************************************************************************************
     */
    is(state) {
        return this.state === state;
    }

    sendAck() {
        const downstream = Object.keys(this.routeTable);

        this.physical.transmit(this.parent, {
            type: BFS_ASSIGN_ACK,
            nextId: this.nextId,
            downstream: downstream,
            fromAddress: this.id,
        });
    }

    nextNeighborIndex() {
        // assigning will be incremented upon receiving ACK or NACK to prevent assigning the same child over and over
        for (let i=this.assigning; i<6; i++) {
            if (this.physical.hasNeighbor(i)) {
                return i;
            }
        }

        return null;
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
        if (this.assigning === null) {
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

                case NETWORK_ROUTE:
                    if (packet.target === this.id) {
                        this.received.push(packet);
                    } else {
                        this.forwardPacket(packet);
                    }
                    break;

                case BFS_ASSIGN_ACK:
                case BFS_ASSIGN_NACK:
                    this.handleAckNack(packet);
                    break;

                default:
                    console.log("Bad network packet: ", packet);
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
            this.assigning = 0;
            this.nextId = packet.id;
            this.state = ASSIGNING;

        } else {
            this.physical.transmit(packet.neighbor, {
                type: BFS_ASSIGN_NACK,
            });
        }
    }

    handleAckNack(packet) {
        // if we aren't waiting, or get a packet from a neighbor we we'ren't assigning to, something went wrong
        if (!this.is(WAITING) || packet.neighbor !== this.assigning) {
            console.log(`Invalid ACK/NACK packet received: ${packet}`);
            return;
        }
        // a valid ACK/NACK moves us to assigning the next child
        this.state = ASSIGNING;
        this.assigning++;
        // record address of neighbor we communicated with (even if it's not a child)
        this.routeTable[packet.fromAddress] = packet.neighbor;
        this.neighborTable[packet.neighbor] = packet.fromAddress;

        // no action necessary for NACK (currently)
        if (packet.type === BFS_ASSIGN_NACK)  return;
        // process ACK normally
        console.log(`${this.id} got ACK from neighbor ${packet.neighbor}`);
        // mark the table as changed if the nextId we got back is different from the one we sent (our current nextId)
        this.tableChange |= this.nextId !== packet.nextId;
        this.nextId = packet.nextId;

        packet.downstream.forEach((address) => {
            this.routeTable[address] = packet.neighbor;
        });
    }
}