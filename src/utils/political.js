/**
 * Replace some prefix in political address, like: Phường/Xã, Quận/Huyện, Thành phố/Tỉnh
 * @param {string} address
 */
export const replacePoliticalType = (address) => {
  if (!address) return address
  const result = address.replace(/Phường |Xã |Quận |Huyện |Thành phố |Tỉnh /g, '')
  return result
}
