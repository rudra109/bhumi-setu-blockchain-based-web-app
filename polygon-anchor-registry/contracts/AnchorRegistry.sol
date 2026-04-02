// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract AnchorRegistry {
    address public owner;

    struct Anchor {
        string docHash;
        uint256 timestamp;
    }

    // Mapping from parcelId to its recorded anchor details
    mapping(string => Anchor) private anchors;

    // Event emitted whenever a new hash is anchored on the ledger
    event HashAnchored(string indexed parcelId, string docHash, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "AnchorRegistry: Caller is not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Stores a document hash on chain. Only the owner can call this.
     * @param parcelId The unique identifier of the parcel
     * @param docHash The hash generated from the document/state
     */
    function anchorHash(string memory parcelId, string memory docHash) public onlyOwner {
        anchors[parcelId] = Anchor({
            docHash: docHash,
            timestamp: block.timestamp
        });

        emit HashAnchored(parcelId, docHash, block.timestamp);
    }

    /**
     * @dev Retrieves the stored document hash for a given parcel.
     * @param parcelId The unique identifier of the parcel
     */
    function verifyHash(string memory parcelId) public view returns (string memory) {
        require(bytes(anchors[parcelId].docHash).length > 0, "AnchorRegistry: No anchor found for this parcel ID");
        return anchors[parcelId].docHash;
    }

    /**
     * @dev Retrieves the timestamp of when the parcel's hash was anchored.
     * @param parcelId The unique identifier of the parcel
     */
    function getAnchorTimestamp(string memory parcelId) public view returns (uint256) {
        require(anchors[parcelId].timestamp > 0, "AnchorRegistry: No anchor found for this parcel ID");
        return anchors[parcelId].timestamp;
    }
}
