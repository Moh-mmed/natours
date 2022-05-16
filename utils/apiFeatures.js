class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString; 
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludedQueries = ['page', 'sort', 'limit', 'fields'];
    excludedQueries.forEach((el) => delete queryObj[el]);

    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  limitFields(defFields) {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select(defFields);
    }
    return this;
  }

  paginate(defPage, defLimit) {
    const page = Number(this.queryString.page) || defPage;
    const limit = Number(this.queryString.limit) || defLimit;
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}
module.exports = APIFeatures;
